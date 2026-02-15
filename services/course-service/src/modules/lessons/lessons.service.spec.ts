import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  let service: LessonsService;

  const mockPrisma = {
    courseSection: {
      findUnique: jest.fn(),
    },
    courseLesson: {
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
        LessonsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findBySectionId ──────────────────────────────────────────────

  describe('findBySectionId', () => {
    it('should return lessons for a given section', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      const lessons = [
        { id: 'l1', title: 'Lesson 1', position: 0 },
        { id: 'l2', title: 'Lesson 2', position: 1 },
      ];
      mockPrisma.courseLesson.findMany.mockResolvedValue(lessons);

      const result = await service.findBySectionId('s1');

      expect(result).toEqual(lessons);
      expect(mockPrisma.courseLesson.findMany).toHaveBeenCalledWith({
        where: { courseSectionId: 's1' },
        orderBy: { position: 'asc' },
      });
    });

    it('should throw NotFoundException if section does not exist', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue(null);

      await expect(service.findBySectionId('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findBySectionId('nonexistent')).rejects.toThrow(
        'Section with id "nonexistent" not found',
      );
    });
  });

  // ─── findById ──────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a lesson with section details', async () => {
      const lesson = {
        id: 'l1',
        title: 'Lesson 1',
        section: { id: 's1', title: 'Section 1', courseId: 'c1' },
      };
      mockPrisma.courseLesson.findUnique.mockResolvedValue(lesson);

      const result = await service.findById('l1');

      expect(result).toEqual(lesson);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Lesson with id "nonexistent" not found',
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      title: 'New Lesson',
      type: 'video' as any,
      content: 'Some content',
      videoUrl: 'http://video.mp4',
      duration: 15,
      position: 2,
      isFreePreview: true,
    };

    it('should create a lesson with all fields', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      const created = { id: 'l1', ...createDto };
      mockPrisma.courseLesson.create.mockResolvedValue(created);

      const result = await service.create('s1', createDto, 'user-1');

      expect(result).toEqual(created);
      expect(mockPrisma.courseLesson.create).toHaveBeenCalledWith({
        data: {
          courseSectionId: 's1',
          title: 'New Lesson',
          content: 'Some content',
          videoUrl: 'http://video.mp4',
          videoDuration: 15,
          position: 2,
          isFree: true,
          createdBy: 'user-1',
        },
      });
    });

    it('should auto-calculate position when not provided (no existing lessons)', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseLesson.findFirst.mockResolvedValue(null);
      mockPrisma.courseLesson.create.mockResolvedValue({ id: 'l1', position: 0 });

      await service.create('s1', { title: 'First', type: 'text' as any });

      expect(mockPrisma.courseLesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 0 }),
      });
    });

    it('should auto-calculate position when not provided (existing lessons)', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseLesson.findFirst.mockResolvedValue({ position: 5 });
      mockPrisma.courseLesson.create.mockResolvedValue({ id: 'l1', position: 6 });

      await service.create('s1', { title: 'Next', type: 'text' as any });

      expect(mockPrisma.courseLesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 6 }),
      });
    });

    it('should use default userId when not provided', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseLesson.create.mockResolvedValue({ id: 'l1' });

      await service.create('s1', { title: 'Test', type: 'text' as any, position: 0 });

      expect(mockPrisma.courseLesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: '00000000-0000-0000-0000-000000000000',
        }),
      });
    });

    it('should use defaults for content and isFreePreview', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.courseLesson.create.mockResolvedValue({ id: 'l1' });

      await service.create('s1', { title: 'Test', type: 'text' as any, position: 0 });

      expect(mockPrisma.courseLesson.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: '',
          isFree: false,
        }),
      });
    });

    it('should throw NotFoundException if section does not exist', async () => {
      mockPrisma.courseSection.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { title: 'Test', type: 'text' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update lesson fields', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({
        id: 'l1',
        section: { id: 's1', title: 'Sect', courseId: 'c1' },
      });
      const updated = { id: 'l1', title: 'Updated' };
      mockPrisma.courseLesson.update.mockResolvedValue(updated);

      const result = await service.update('l1', {
        title: 'Updated',
        content: 'New content',
        videoUrl: 'http://new.mp4',
        duration: 30,
        position: 5,
        isFreePreview: false,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.courseLesson.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: {
          title: 'Updated',
          content: 'New content',
          videoUrl: 'http://new.mp4',
          videoDuration: 30,
          position: 5,
          isFree: false,
        },
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({
        id: 'l1',
        section: { id: 's1', title: 'Sect', courseId: 'c1' },
      });
      mockPrisma.courseLesson.update.mockResolvedValue({ id: 'l1' });

      await service.update('l1', { title: 'Only Title' });

      const updateCall = mockPrisma.courseLesson.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ title: 'Only Title' });
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a lesson', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({
        id: 'l1',
        section: { id: 's1', title: 'Sect', courseId: 'c1' },
      });
      mockPrisma.courseLesson.delete.mockResolvedValue(undefined);

      await service.remove('l1');

      expect(mockPrisma.courseLesson.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
