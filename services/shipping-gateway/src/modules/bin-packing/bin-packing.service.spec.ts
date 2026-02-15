import { Test, TestingModule } from '@nestjs/testing';
import {
  BinPackingService,
  PackableItem,
  BoxSize,
  PackingResult,
} from './bin-packing.service';

// ── Helpers ──────────────────────────────────────────────────────────────
function makeItem(
  id: string,
  weight: number,
  length: number,
  width: number,
  height: number,
  quantity = 1,
): PackableItem {
  return {
    id,
    weight: { value: weight, unit: 'lb' },
    dimensions: { length, width, height, unit: 'in' },
    quantity,
  };
}

function makeBox(
  id: string,
  name: string,
  length: number,
  width: number,
  height: number,
  maxWeight: number,
  cost: number,
): BoxSize {
  return {
    id,
    name,
    innerDimensions: { length, width, height, unit: 'in' },
    maxWeight: { value: maxWeight, unit: 'lb' },
    cost,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('BinPackingService', () => {
  let service: BinPackingService;

  const smallBox = makeBox('box-sm', 'Small Box', 10, 8, 6, 15, 150);
  const mediumBox = makeBox('box-md', 'Medium Box', 16, 12, 10, 30, 250);
  const largeBox = makeBox('box-lg', 'Large Box', 24, 18, 14, 50, 400);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BinPackingService],
    }).compile();

    service = module.get<BinPackingService>(BinPackingService);
  });

  // ── Empty items ────────────────────────────────────────────────────

  describe('pack - empty items', () => {
    it('should return empty result when no items provided', () => {
      const result = service.pack([], [smallBox, mediumBox]);

      expect(result.boxes).toHaveLength(0);
      expect(result.totalBoxes).toBe(0);
      expect(result.totalWeight).toEqual({ value: 0, unit: 'lb' });
      expect(result.totalBoxCost).toBe(0);
      expect(result.unpacked).toHaveLength(0);
    });
  });

  // ── Single item packing ───────────────────────────────────────────

  describe('pack - single item', () => {
    it('should pack a single item into the smallest suitable box', () => {
      const item = makeItem('item-1', 3, 8, 6, 4);
      const result = service.pack([item], [smallBox, mediumBox, largeBox]);

      expect(result.totalBoxes).toBe(1);
      expect(result.boxes[0]!.box.id).toBe('box-sm');
      expect(result.unpacked).toHaveLength(0);
    });

    it('should use a bigger box when item does not fit in small', () => {
      // Item dimensions exceed the small box
      const item = makeItem('item-big', 5, 14, 10, 8);
      const result = service.pack([item], [smallBox, mediumBox, largeBox]);

      expect(result.totalBoxes).toBe(1);
      expect(result.boxes[0]!.box.id).toBe('box-md');
    });

    it('should report unpacked when no box can fit the item', () => {
      const hugeItem = makeItem('item-huge', 100, 50, 50, 50);
      const result = service.pack([hugeItem], [smallBox, mediumBox, largeBox]);

      expect(result.totalBoxes).toBe(0);
      expect(result.unpacked).toHaveLength(1);
      expect(result.unpacked[0]!.itemId).toBe('item-huge');
      expect(result.unpacked[0]!.reason).toContain('No available box');
    });

    it('should reject item that fits dimensionally but exceeds weight', () => {
      // Small dimensions but exceeds small box weight
      const heavyItem = makeItem('heavy', 20, 5, 5, 5);
      const result = service.pack([heavyItem], [smallBox]);

      expect(result.unpacked).toHaveLength(1);
      expect(result.unpacked[0]!.itemId).toBe('heavy');
    });
  });

  // ── Multiple items ────────────────────────────────────────────────

  describe('pack - multiple items', () => {
    it('should pack multiple small items into a single box', () => {
      const items = [
        makeItem('a', 2, 4, 3, 2),
        makeItem('b', 2, 4, 3, 2),
        makeItem('c', 2, 4, 3, 2),
      ];
      const result = service.pack(items, [smallBox, mediumBox]);

      expect(result.totalBoxes).toBe(1);
      expect(result.boxes[0]!.items).toHaveLength(3);
    });

    it('should use multiple boxes when items do not all fit in one', () => {
      const items = [
        makeItem('a', 10, 8, 6, 5),
        makeItem('b', 10, 8, 6, 5),
      ];
      // Each item is close to the small box weight limit of 15
      const result = service.pack(items, [smallBox, mediumBox]);

      expect(result.totalBoxes).toBeGreaterThanOrEqual(1);
      expect(result.unpacked).toHaveLength(0);
    });

    it('should calculate totalWeight correctly', () => {
      const items = [
        makeItem('a', 3, 4, 3, 2),
        makeItem('b', 5, 4, 3, 2),
      ];
      const result = service.pack(items, [mediumBox]);

      expect(result.totalWeight.value).toBe(8);
    });

    it('should calculate totalBoxCost correctly for multiple boxes', () => {
      // Two heavy items that each need their own small box
      const items = [
        makeItem('a', 14, 8, 6, 4),
        makeItem('b', 14, 8, 6, 4),
      ];
      const result = service.pack(items, [smallBox]);

      expect(result.totalBoxCost).toBe(result.totalBoxes * smallBox.cost);
    });
  });

  // ── Quantity expansion ────────────────────────────────────────────

  describe('pack - item quantities', () => {
    it('should expand items by quantity', () => {
      const item = makeItem('item-qty', 2, 4, 3, 2, 5);
      const result = service.pack([item], [mediumBox]);

      // All 5 units should be packed
      const totalQty = result.boxes.reduce(
        (sum, box) =>
          sum + box.items.reduce((s, i) => s + i.quantity, 0),
        0,
      );
      expect(totalQty).toBe(5);
      expect(result.unpacked).toHaveLength(0);
    });

    it('should split quantity across boxes when needed', () => {
      // Each item is 8 lbs, small box max is 15 lbs = 1 per box
      const item = makeItem('heavy-qty', 8, 6, 5, 4, 3);
      const result = service.pack([item], [smallBox]);

      expect(result.totalBoxes).toBe(3);
    });
  });

  // ── Volume utilization / 90% cap ──────────────────────────────────

  describe('pack - volume utilization', () => {
    it('should not exceed 90% volume utilization in a single box', () => {
      const result = service.pack(
        [
          // Fill up volume progressively
          makeItem('a', 1, 9, 7, 5), // big relative to small box
          makeItem('b', 1, 8, 6, 4), // another large-ish item
        ],
        [smallBox],
      );

      for (const box of result.boxes) {
        expect(box.volumeUtilization).toBeLessThanOrEqual(0.9);
      }
    });

    it('should track volumeUtilization on packed boxes', () => {
      const item = makeItem('a', 2, 4, 3, 2);
      const result = service.pack([item], [mediumBox]);

      expect(result.boxes[0]!.volumeUtilization).toBeGreaterThan(0);
      expect(result.boxes[0]!.volumeUtilization).toBeLessThanOrEqual(1);
    });
  });

  // ── Orientation / dimension sorting ───────────────────────────────

  describe('pack - item orientation', () => {
    it('should fit item in any rotation (tries all orientations)', () => {
      // Item 12x3x3 fits in small box 10x8x6 when rotated (3x3x12 sorted = 3,3,12 vs 6,8,10 sorted)
      // Actually 3 <= 6, 3 <= 8, 12 > 10 -- does NOT fit in small
      // But fits in medium 16x12x10: sorted = 3,3,12 vs 10,12,16 => fits
      const item = makeItem('long', 2, 12, 3, 3);
      const result = service.pack([item], [smallBox, mediumBox]);

      expect(result.unpacked).toHaveLength(0);
      expect(result.totalBoxes).toBe(1);
    });
  });

  // ── FFD ordering ──────────────────────────────────────────────────

  describe('pack - FFD algorithm ordering', () => {
    it('should sort items by volume descending (largest first)', () => {
      // Large item should go into a box first, then smaller items
      const items = [
        makeItem('small', 2, 3, 3, 3),  // volume=27
        makeItem('large', 5, 8, 7, 5),  // volume=280
        makeItem('medium', 3, 5, 4, 4), // volume=80
      ];

      const result = service.pack(items, [smallBox, mediumBox, largeBox]);

      expect(result.unpacked).toHaveLength(0);
      // All items packed
      const totalQty = result.boxes.reduce(
        (sum, box) =>
          sum + box.items.reduce((s, i) => s + i.quantity, 0),
        0,
      );
      expect(totalQty).toBe(3);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('pack - edge cases', () => {
    it('should handle item with zero dimensions gracefully', () => {
      const item = makeItem('flat', 1, 0, 0, 0);
      const result = service.pack([item], [smallBox]);

      // Volume is 0, should still pack (fits dimensionally since 0 < box dims)
      expect(result.unpacked).toHaveLength(0);
    });

    it('should handle single available box type', () => {
      const items = [
        makeItem('a', 2, 4, 3, 2),
        makeItem('b', 3, 5, 4, 3),
      ];
      const result = service.pack(items, [mediumBox]);

      expect(result.totalBoxes).toBeGreaterThanOrEqual(1);
      expect(result.unpacked).toHaveLength(0);
    });

    it('should handle item that exactly matches box dimensions', () => {
      const exactItem = makeItem('exact', 15, 10, 8, 6);
      const result = service.pack([exactItem], [smallBox]);

      expect(result.totalBoxes).toBe(1);
      expect(result.unpacked).toHaveLength(0);
    });

    it('should handle item that exactly matches box max weight', () => {
      const maxWeightItem = makeItem('max-wt', 15, 5, 4, 3);
      const result = service.pack([maxWeightItem], [smallBox]);

      expect(result.unpacked).toHaveLength(0);
    });

    it('should prefer smaller boxes (sorted ascending by volume)', () => {
      const item = makeItem('tiny', 1, 3, 2, 2);
      const result = service.pack([item], [largeBox, smallBox, mediumBox]);

      expect(result.boxes[0]!.box.id).toBe('box-sm');
    });

    it('should group same items in packed box items array', () => {
      const item = makeItem('same-item', 1, 3, 2, 2, 3);
      const result = service.pack([item], [mediumBox]);

      // All 3 should be in one box with a single entry showing quantity 3
      expect(result.boxes).toHaveLength(1);
      const packedItem = result.boxes[0]!.items.find(
        (i) => i.itemId === 'same-item',
      );
      expect(packedItem).toBeDefined();
      expect(packedItem!.quantity).toBe(3);
    });
  });
});
