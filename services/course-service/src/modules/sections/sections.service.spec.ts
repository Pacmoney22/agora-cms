import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SectionsService } from './sections.service';

describe('SectionsService', () => {
  let service: SectionsService;

  const mockPrisma = {
    course: {
      findUnique: jest.fn(),
    },
    courseSection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findByCourseId ────────────────────────────────────────────────

  describe('findByCourseId', () => {
    it('should return sections with lessons for a given course', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      const sections = [
        { id: 's1', lessons: [{ id: 'l1' }] },
        { id: 's2', lessons: [] },
      ];
      mockPrisma.courseSection.findMany.mockResolvedValue(sections);

      const result = await service.findByCourseId('c1');

      expect(result).toEqual(sections);
      expect(mockPrisma.courseSection.findMany).toHaveBeenCalledWith({
        where: { courseId: 'c1' },
        orderBy: { position: 'asc' },
        include: expect.objectContaining({
          lessons: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.findByCourseId('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findByCourseId('nonexistent')).rejects.toThrow(
        'Course with id "nonexistent" not found',
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a section with provided position', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      const section = { id: 's1', title: 'Section 1', position: 2 };
      mockPrisma.courseSection.create.mockResolvedValue(section);

      const result = await service.create('c1', {
        title: 'Section 1',
        description: 'Desc',
        position: 2,
      });

      expect(result).toEqual(section);
      expect(mockPrisma.courseSection.create).toHaveBeenCalledWith({
        data: {
          courseId: 'c1',
          title: 'Section 1',
          description: 'Desc',
          position: 2,
        },
      });
    });

    it('should auto-calculate position when not provided (no existing sections)', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.courseSection.findFirst.mockResolvedValue(null);
      mockPrisma.courseSection.create.mockResolvedValue({ id: 's1', position: 0 });

      await service.create('c1', { title: 'First Section' });

      expect(mockPrisma.courseSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 0 }),
      });
    });

    it('should auto-calculate position when not provided (existing sections)', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.courseSection.findFirst.mockResolvedValue({ position: 3 });
      mockPrisma.courseSection.create.mockResolvedValue({ id: 's1', position: 4 });

      await service.create('c1', { title: 'Next Section' });

      expect(mockPrisma.courseSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 4 }),
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update section fields', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1', title: 'Old' });
      const updated = { id: 's1', title: 'New', description: 'Updated', position: 5 };
      mockPrisma.courseSection.update.mockResolvedValue(updated);

      const result = await service.update('s1', {
        title: 'New',
        description: 'Updated',
        position: 5,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.courseSection.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { title: 'New', description: 'Updated', position: 5 },
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseSection.update.mockResolvedValue({ id: 's1', title: 'New' });

      await service.update('s1', { title: 'New' });

      const updateCall = mockPrisma.courseSection.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ title: 'New' });
    });

    it('should throw NotFoundException if section does not exist', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(
        'Section with id "nonexistent" not found',
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a section', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseSection.delete.mockResolvedValue(undefined);

      await service.remove('s1');

      expect(mockPrisma.courseSection.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('should throw NotFoundException if section does not exist', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.remove('nonexistent')).rejects.toThrow(
        'Section with id "nonexistent" not found',
      );
    });
  });
});
