import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { NavigationService } from '../../src/modules/navigation/navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;

  const mockPrisma = {
    navigation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NavigationService>(NavigationService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all navigations ordered by location', async () => {
      const navs = [
        { id: 'n1', location: 'footer', items: [] },
        { id: 'n2', location: 'header', items: [] },
      ];
      mockPrisma.navigation.findMany.mockResolvedValue(navs);

      const result = await service.findAll();

      expect(result).toEqual(navs);
      expect(mockPrisma.navigation.findMany).toHaveBeenCalledWith({
        orderBy: { location: 'asc' },
      });
    });

    it('should return empty array when no navigations exist', async () => {
      mockPrisma.navigation.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // findByLocation
  // -----------------------------------------------------------------------
  describe('findByLocation', () => {
    it('should return navigation for a given location', async () => {
      const nav = {
        id: 'n1',
        location: 'header',
        items: [{ label: 'Home', href: '/' }],
      };
      mockPrisma.navigation.findUnique.mockResolvedValue(nav);

      const result = await service.findByLocation('header');

      expect(result).toEqual(nav);
      expect(mockPrisma.navigation.findUnique).toHaveBeenCalledWith({
        where: { location: 'header' },
      });
    });

    it('should throw NotFoundException when location not found', async () => {
      mockPrisma.navigation.findUnique.mockResolvedValue(null);

      await expect(service.findByLocation('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // upsert
  // -----------------------------------------------------------------------
  describe('upsert', () => {
    it('should create navigation if it does not exist', async () => {
      const items = [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
      ];
      const nav = { id: 'n1', location: 'header', items };
      mockPrisma.navigation.upsert.mockResolvedValue(nav);

      const result = await service.upsert('header', items);

      expect(result).toEqual(nav);
      expect(mockPrisma.navigation.upsert).toHaveBeenCalledWith({
        where: { location: 'header' },
        create: { location: 'header', items },
        update: { items },
      });
    });

    it('should update navigation if it exists', async () => {
      const items = [{ label: 'New Home', href: '/' }];
      const nav = { id: 'n1', location: 'footer', items };
      mockPrisma.navigation.upsert.mockResolvedValue(nav);

      const result = await service.upsert('footer', items);

      expect(result).toEqual(nav);
    });

    it('should handle empty items array', async () => {
      const nav = { id: 'n1', location: 'sidebar', items: [] };
      mockPrisma.navigation.upsert.mockResolvedValue(nav);

      const result = await service.upsert('sidebar', []);

      expect(result.items).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('should delete navigation by location', async () => {
      mockPrisma.navigation.findUnique.mockResolvedValue({
        id: 'n1',
        location: 'header',
      });
      mockPrisma.navigation.delete.mockResolvedValue({});

      await service.delete('header');

      expect(mockPrisma.navigation.delete).toHaveBeenCalledWith({
        where: { location: 'header' },
      });
    });

    it('should throw NotFoundException when location not found', async () => {
      mockPrisma.navigation.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
