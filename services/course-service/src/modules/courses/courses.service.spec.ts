import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockPrisma = {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    courseEnrollment: {
      count: jest.fn(),
    },
    courseSection: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ───────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated courses with default options', async () => {
      const mockCourses = [
        { id: 'c1', title: 'Course 1', description: 'Desc 1' },
        { id: 'c2', title: 'Course 2', description: 'Desc 2' },
      ];
      mockPrisma.course.findMany.mockResolvedValue(mockCourses);
      mockPrisma.course.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toEqual(mockCourses);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: expect.objectContaining({ id: true, title: true }),
      });
    });

    it('should apply filters for status, category, and level', async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);

      await service.findAll({
        status: 'published',
        category: 'Programming',
        level: 'beginner',
        page: 2,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'published', category: 'Programming', level: 'beginner' },
          skip: 10,
          take: 10,
          orderBy: { title: 'asc' },
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(25);

      const result = await service.findAll({ limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a course with sections and lessons', async () => {
      const mockCourse = {
        id: 'c1',
        title: 'Course 1',
        sections: [
          {
            id: 's1',
            lessons: [{ id: 'l1', title: 'Lesson 1' }],
          },
        ],
      };
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findById('c1');

      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        include: expect.objectContaining({
          sections: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Course with id "nonexistent" not found',
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      title: 'Introduction to TypeScript',
      description: 'Learn TS basics',
      thumbnail: 'http://example.com/thumb.jpg',
      level: 'beginner' as const,
      estimatedHours: 10,
      category: 'Programming',
      tags: ['typescript', 'javascript'],
      objectives: ['Learn TS'],
      prerequisites: ['Know JS'],
    };

    it('should create a course with a unique slug', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null); // no existing slug
      const createdCourse = { id: 'new-id', ...createDto, slug: 'introduction-to-typescript', status: 'draft' };
      mockPrisma.course.create.mockResolvedValue(createdCourse);

      const result = await service.create(createDto, 'user-1');

      expect(result).toEqual(createdCourse);
      expect(mockPrisma.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Introduction to TypeScript',
          slug: 'introduction-to-typescript',
          description: 'Learn TS basics',
          status: 'draft',
          createdBy: 'user-1',
        }),
      });
    });

    it('should append a timestamp to slug if slug already exists', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'existing-id' }); // slug already exists
      mockPrisma.course.create.mockResolvedValue({ id: 'new-id', slug: 'introduction-to-typescript-abc123' });

      await service.create(createDto);

      const createCall = mockPrisma.course.create.mock.calls[0][0];
      expect(createCall.data.slug).toMatch(/^introduction-to-typescript-[a-z0-9]+$/);
    });

    it('should use defaults for optional fields when not provided', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue({ id: 'new-id' });

      await service.create({ title: 'Minimal', description: 'Desc' });

      const createCall = mockPrisma.course.create.mock.calls[0][0];
      expect(createCall.data.courseMetadata).toEqual(
        expect.objectContaining({
          learningObjectives: [],
          prerequisites: [],
          estimatedHours: 0,
          difficulty: 'beginner',
          tags: [],
        }),
      );
    });

    it('should set createdBy to undefined when userId is not provided', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue({ id: 'new-id' });

      await service.create({ title: 'Test', description: 'Desc' });

      const createCall = mockPrisma.course.create.mock.calls[0][0];
      expect(createCall.data.createdBy).toBeUndefined();
    });
  });

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    const existingCourse = {
      id: 'c1',
      title: 'Old Title',
      courseMetadata: {
        difficulty: 'beginner',
        estimatedHours: 5,
        category: 'Programming',
        tags: ['js'],
        learningObjectives: [],
        prerequisites: [],
      },
      status: 'draft',
      sections: [],
    };

    it('should update course title and metadata fields', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(existingCourse);
      const updatedCourse = { ...existingCourse, title: 'New Title' };
      mockPrisma.course.update.mockResolvedValue(updatedCourse);

      const result = await service.update('c1', {
        title: 'New Title',
        level: 'advanced' as any,
        estimatedHours: 20,
      });

      expect(result).toEqual(updatedCourse);
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({
          title: 'New Title',
          courseMetadata: expect.objectContaining({
            difficulty: 'advanced',
            estimatedHours: 20,
          }),
        }),
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not include courseMetadata when no metadata fields are updated', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(existingCourse);
      mockPrisma.course.update.mockResolvedValue(existingCourse);

      await service.update('c1', { title: 'New Title' });

      const updateCall = mockPrisma.course.update.mock.calls[0][0];
      expect(updateCall.data.courseMetadata).toBeUndefined();
    });

    it('should update description and thumbnail', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(existingCourse);
      mockPrisma.course.update.mockResolvedValue(existingCourse);

      await service.update('c1', {
        description: 'New Desc',
        thumbnail: 'http://new-thumb.jpg',
      });

      const updateCall = mockPrisma.course.update.mock.calls[0][0];
      expect(updateCall.data.description).toBe('New Desc');
      expect(updateCall.data.thumbnailUrl).toBe('http://new-thumb.jpg');
    });
  });

  // ─── remove ────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a course with no enrollments', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1', sections: [] });
      mockPrisma.courseEnrollment.count.mockResolvedValue(0);
      mockPrisma.course.delete.mockResolvedValue(undefined);

      await service.remove('c1');

      expect(mockPrisma.course.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('should throw BadRequestException if course has enrollments', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1', sections: [] });
      mockPrisma.courseEnrollment.count.mockResolvedValue(3);

      await expect(service.remove('c1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('c1')).rejects.toThrow(
        'Cannot delete course with active enrollments',
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── publish ───────────────────────────────────────────────────────

  describe('publish', () => {
    it('should publish a draft course with sections', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'draft',
        sections: [],
      });
      mockPrisma.courseSection.count.mockResolvedValue(2);
      const publishedCourse = { id: 'c1', status: 'published' };
      mockPrisma.course.update.mockResolvedValue(publishedCourse);

      const result = await service.publish('c1');

      expect(result).toEqual(publishedCourse);
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'published', publishedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException if course is already published', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'published',
        sections: [],
      });

      await expect(service.publish('c1')).rejects.toThrow(BadRequestException);
      await expect(service.publish('c1')).rejects.toThrow('Course is already published');
    });

    it('should throw BadRequestException if course has no sections', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'draft',
        sections: [],
      });
      mockPrisma.courseSection.count.mockResolvedValue(0);

      await expect(service.publish('c1')).rejects.toThrow(BadRequestException);
      await expect(service.publish('c1')).rejects.toThrow(
        'Cannot publish course without sections',
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.publish('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── unpublish ─────────────────────────────────────────────────────

  describe('unpublish', () => {
    it('should unpublish a published course', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'published',
        sections: [],
      });
      const unpublishedCourse = { id: 'c1', status: 'draft', publishedAt: null };
      mockPrisma.course.update.mockResolvedValue(unpublishedCourse);

      const result = await service.unpublish('c1');

      expect(result).toEqual(unpublishedCourse);
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'draft', publishedAt: null },
      });
    });

    it('should throw BadRequestException if course is not published', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'draft',
        sections: [],
      });

      await expect(service.unpublish('c1')).rejects.toThrow(BadRequestException);
      await expect(service.unpublish('c1')).rejects.toThrow(
        'Course is not currently published',
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.unpublish('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
