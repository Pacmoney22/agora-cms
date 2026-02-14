import { Injectable, Logger } from '@nestjs/common';

/**
 * Represents an item to be packed.
 */
export interface PackableItem {
  id: string;
  weight: { value: number; unit: string };
  dimensions: { length: number; width: number; height: number; unit: string };
  quantity: number;
}

/**
 * Represents an available box size.
 */
export interface BoxSize {
  id: string;
  name: string;
  innerDimensions: { length: number; width: number; height: number; unit: string };
  maxWeight: { value: number; unit: string };
  cost: number; // cents - box material cost
}

/**
 * A packed box with its contents.
 */
export interface PackedBox {
  box: BoxSize;
  items: Array<{ itemId: string; quantity: number }>;
  totalWeight: { value: number; unit: string };
  volumeUtilization: number; // 0-1
}

/**
 * Result of the bin packing algorithm.
 */
export interface PackingResult {
  boxes: PackedBox[];
  totalBoxes: number;
  totalWeight: { value: number; unit: string };
  totalBoxCost: number; // cents
  unpacked: Array<{ itemId: string; reason: string }>;
}

/**
 * First-Fit-Decreasing (FFD) bin packing service.
 *
 * Takes cart items with weight and dimensions and a list of available
 * box sizes, returns optimal packaging. Items are sorted by volume
 * (largest first) and placed into the smallest box that fits.
 */
@Injectable()
export class BinPackingService {
  private readonly logger = new Logger(BinPackingService.name);

  /**
   * Pack items into boxes using the First-Fit-Decreasing algorithm.
   */
  pack(items: PackableItem[], availableBoxes: BoxSize[]): PackingResult {
    if (items.length === 0) {
      return {
        boxes: [],
        totalBoxes: 0,
        totalWeight: { value: 0, unit: 'lb' },
        totalBoxCost: 0,
        unpacked: [],
      };
    }

    // Expand items by quantity into individual units
    const expandedItems = this.expandItems(items);

    // Sort items by volume descending (First-Fit-Decreasing)
    expandedItems.sort((a, b) => {
      const volA = this.itemVolume(a);
      const volB = this.itemVolume(b);
      return volB - volA;
    });

    // Sort available boxes by volume ascending (prefer smaller boxes)
    const sortedBoxes = [...availableBoxes].sort((a, b) => {
      const volA = this.boxVolume(a);
      const volB = this.boxVolume(b);
      return volA - volB;
    });

    const packedBoxes: PackedBox[] = [];
    const unpacked: Array<{ itemId: string; reason: string }> = [];

    for (const item of expandedItems) {
      let placed = false;

      // Try to fit into an existing open box first
      for (const packed of packedBoxes) {
        if (this.canFitInBox(item, packed)) {
          this.addItemToBox(item, packed);
          placed = true;
          break;
        }
      }

      // If not placed, open a new box
      if (!placed) {
        const suitableBox = this.findSmallestSuitableBox(item, sortedBoxes);

        if (suitableBox) {
          const newPackedBox: PackedBox = {
            box: suitableBox,
            items: [],
            totalWeight: { value: 0, unit: item.weight.unit },
            volumeUtilization: 0,
          };
          this.addItemToBox(item, newPackedBox);
          packedBoxes.push(newPackedBox);
          placed = true;
        }
      }

      if (!placed) {
        unpacked.push({
          itemId: item.id,
          reason: 'No available box can fit this item',
        });
      }
    }

    // Calculate totals
    const totalWeight = packedBoxes.reduce(
      (sum, pb) => sum + pb.totalWeight.value,
      0,
    );
    const totalBoxCost = packedBoxes.reduce(
      (sum, pb) => sum + pb.box.cost,
      0,
    );
    const weightUnit = packedBoxes[0]?.totalWeight.unit || 'lb';

    this.logger.log(
      `Packed ${expandedItems.length} item(s) into ${packedBoxes.length} box(es)` +
        (unpacked.length > 0 ? `, ${unpacked.length} item(s) unpacked` : ''),
    );

    return {
      boxes: packedBoxes,
      totalBoxes: packedBoxes.length,
      totalWeight: { value: totalWeight, unit: weightUnit },
      totalBoxCost,
      unpacked,
    };
  }

  /**
   * Expand items by their quantity into individual packable units.
   */
  private expandItems(
    items: PackableItem[],
  ): PackableItem[] {
    const expanded: PackableItem[] = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        expanded.push({ ...item, quantity: 1 });
      }
    }
    return expanded;
  }

  /**
   * Check if an item can fit into an already-packed box
   * considering both remaining volume and weight capacity.
   */
  private canFitInBox(item: PackableItem, packed: PackedBox): boolean {
    // Check weight capacity
    const newWeight = packed.totalWeight.value + item.weight.value;
    if (newWeight > packed.box.maxWeight.value) {
      return false;
    }

    // Check volume capacity (simplified: compare volume utilization)
    const itemVol = this.itemVolume(item);
    const boxVol = this.boxVolume(packed.box);
    const usedVol = packed.volumeUtilization * boxVol;
    const newUtilization = (usedVol + itemVol) / boxVol;

    // Allow up to 90% utilization to account for irregular packing
    return newUtilization <= 0.9;
  }

  /**
   * Add an item to a packed box and update totals.
   */
  private addItemToBox(item: PackableItem, packed: PackedBox): void {
    const existing = packed.items.find((i) => i.itemId === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      packed.items.push({ itemId: item.id, quantity: 1 });
    }

    packed.totalWeight.value += item.weight.value;

    const itemVol = this.itemVolume(item);
    const boxVol = this.boxVolume(packed.box);
    const usedVol = packed.volumeUtilization * boxVol;
    packed.volumeUtilization = (usedVol + itemVol) / boxVol;
  }

  /**
   * Find the smallest box that can fit a single item.
   */
  private findSmallestSuitableBox(
    item: PackableItem,
    sortedBoxes: BoxSize[],
  ): BoxSize | null {
    const itemVol = this.itemVolume(item);
    const { length, width, height } = item.dimensions;

    for (const box of sortedBoxes) {
      const boxDims = box.innerDimensions;

      // Check that item fits dimensionally (try all orientations)
      const itemDims = [length, width, height].sort((a, b) => a - b);
      const boxInner = [boxDims.length, boxDims.width, boxDims.height].sort(
        (a, b) => a - b,
      );

      const fits =
        itemDims[0]! <= boxInner[0]! &&
        itemDims[1]! <= boxInner[1]! &&
        itemDims[2]! <= boxInner[2]!;

      // Check weight
      const weightFits = item.weight.value <= box.maxWeight.value;

      if (fits && weightFits) {
        return box;
      }
    }

    return null;
  }

  private itemVolume(item: PackableItem): number {
    return (
      item.dimensions.length * item.dimensions.width * item.dimensions.height
    );
  }

  private boxVolume(box: BoxSize): number {
    return (
      box.innerDimensions.length *
      box.innerDimensions.width *
      box.innerDimensions.height
    );
  }
}
