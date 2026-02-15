import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { CertificatesService } from '../certificates/certificates.service';

import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const mockPrisma = {
    courseEnrollment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  };

  const mockCertificatesService = {
    generateCertificate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: CertificatesService, useValue: mockCertificatesService },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ───────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated enrollments with defaults', async () => {
      const mockEnrollments = [{ id: 'e1' }, { id: 'e2' }];
      mockPrisma.courseEnrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.courseEnrollment.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toEqual(mockEnrollments);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should apply filters for userId, courseId, and status', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);
      mockPrisma.courseEnrollment.count.mockResolvedValue(0);

      await service.findAll({
        userId: 'u1',
        courseId: 'c1',
        status: 'active',
        page: 2,
        limit: 5,
      });

      expect(mockPrisma.courseEnrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', courseId: 'c1', status: 'active' },
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);
      mockPrisma.courseEnrollment.count.mockResolvedValue(25);

      const result = await service.findAll({ limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return an enrollment with course and progress', async () => {
      const mockEnrollment = {
        id: 'e1',
        course: { id: 'c1', sections: [] },
        progress: [],
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment);

      const result = await service.findById('e1');

      expect(result).toEqual(mockEnrollment);
      expect(mockPrisma.courseEnrollment.findUnique).toHaveBeenCalledWith({
        where: { id: 'e1' },
        include: expect.objectContaining({
          course: expect.any(Object),
          progress: true,
        }),
      });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Enrollment with id "nonexistent" not found',
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      userId: 'u1',
      courseId: 'c1',
      orderId: 'o1',
      orderLineItemId: 'oli1',
      expiresAt: new Date('2025-12-31'),
    };

    it('should create an enrollment successfully', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null);
      const createdEnrollment = { id: 'e1', ...createDto, status: 'active' };
      mockPrisma.courseEnrollment.create.mockResolvedValue(createdEnrollment);

      const result = await service.create(createDto);

      expect(result).toEqual(createdEnrollment);
      expect(mockPrisma.courseEnrollment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          courseId: 'c1',
          status: 'active',
          progressPercent: 0,
        }),
        include: { course: true },
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Course with id "c1" not found',
      );
    });

    it('should throw ConflictException if already enrolled', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow(
        'User u1 is already enrolled in course c1',
      );
    });

    it('should handle optional orderId and orderLineItemId as undefined', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.courseEnrollment.create.mockResolvedValue({ id: 'e1' });

      await service.create({ userId: 'u1', courseId: 'c1' });

      const createCall = mockPrisma.courseEnrollment.create.mock.calls[0][0];
      expect(createCall.data.orderId).toBeUndefined();
      expect(createCall.data.orderLineItemId).toBeUndefined();
      expect(createCall.data.expiresAt).toBeUndefined();
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel an enrollment', async () => {
      const enrollment = {
        id: 'e1',
        course: { sections: [] },
        progress: [],
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollment);
      const cancelled = { id: 'e1', status: 'suspended' };
      mockPrisma.courseEnrollment.update.mockResolvedValue(cancelled);

      const result = await service.cancel('e1');

      expect(result).toEqual(cancelled);
      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { status: 'suspended' },
      });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── complete ──────────────────────────────────────────────────────

  describe('complete', () => {
    it('should complete an enrollment and auto-generate certificate', async () => {
      const enrollment = {
        id: 'e1',
        course: { sections: [] },
        progress: [],
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollment);
      const completed = { id: 'e1', status: 'completed', progressPercent: 100 };
      mockPrisma.courseEnrollment.update.mockResolvedValue(completed);
      mockCertificatesService.generateCertificate.mockResolvedValue({ id: 'cert1' });

      const result = await service.complete('e1');

      expect(result).toEqual(completed);
      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
          progressPercent: 100,
        },
      });
      expect(mockCertificatesService.generateCertificate).toHaveBeenCalledWith('e1');
    });

    it('should not fail if certificate generation throws', async () => {
      const enrollment = {
        id: 'e1',
        course: { sections: [] },
        progress: [],
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollment);
      mockPrisma.courseEnrollment.update.mockResolvedValue({ id: 'e1', status: 'completed' });
      mockCertificatesService.generateCertificate.mockRejectedValue(
        new Error('S3 unavailable'),
      );

      const result = await service.complete('e1');

      expect(result).toEqual({ id: 'e1', status: 'completed' });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(service.complete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateProgress ────────────────────────────────────────────────

  describe('updateProgress', () => {
    it('should update enrollment progress', async () => {
      const enrollment = {
        id: 'e1',
        course: { sections: [] },
        progress: [],
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollment);
      const updated = { id: 'e1', progressPercent: 50 };
      mockPrisma.courseEnrollment.update.mockResolvedValue(updated);

      const result = await service.updateProgress('e1', 50);

      expect(result).toEqual(updated);
      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { progressPercent: 50 },
      });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(service.updateProgress('nonexistent', 50)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
