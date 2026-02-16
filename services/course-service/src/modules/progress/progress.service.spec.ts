import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;

  const mockPrisma = {
    courseEnrollment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    courseProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Helper to create enrollment mock data
  const makeEnrollment = (overrides: any = {}) => ({
    id: 'e1',
    courseId: 'c1',
    progressPercent: 0,
    course: {
      sections: [
        { lessons: [{ id: 'l1' }, { id: 'l2' }] },
        { lessons: [{ id: 'l3' }] },
      ],
    },
    progress: [],
    ...overrides,
  });

  // ─── updateLessonProgress ──────────────────────────────────────────

  describe('updateLessonProgress', () => {
    it('should update lesson progress (mark as completed)', async () => {
      // First call: for updateLessonProgress verification
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());
      const progressRecord = { id: 'p1', isCompleted: true, lessonId: 'l1' };
      mockPrisma.courseProgress.upsert.mockResolvedValue(progressRecord);

      // Second call: for recalculateEnrollmentProgress
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(
        makeEnrollment({ progress: [{ isCompleted: true }] }),
      );
      mockPrisma.courseEnrollment.update.mockResolvedValue({});

      const result = await service.updateLessonProgress('e1', 'l1', true, 100);

      expect(result).toEqual(progressRecord);
      expect(mockPrisma.courseProgress.upsert).toHaveBeenCalledWith({
        where: {
          enrollmentId_lessonId: { enrollmentId: 'e1', lessonId: 'l1' },
        },
        update: {
          isCompleted: true,
          completedAt: expect.any(Date),
          videoProgress: 100,
          lastViewedAt: expect.any(Date),
        },
        create: {
          enrollmentId: 'e1',
          lessonId: 'l1',
          isCompleted: true,
          completedAt: expect.any(Date),
          videoProgress: 100,
          lastViewedAt: expect.any(Date),
        },
      });
    });

    it('should update lesson progress (mark as not completed)', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());
      mockPrisma.courseProgress.upsert.mockResolvedValue({ id: 'p1', isCompleted: false });
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(
        makeEnrollment({ progress: [] }),
      );
      mockPrisma.courseEnrollment.update.mockResolvedValue({});

      await service.updateLessonProgress('e1', 'l1', false);

      expect(mockPrisma.courseProgress.upsert).toHaveBeenCalledWith({
        where: {
          enrollmentId_lessonId: { enrollmentId: 'e1', lessonId: 'l1' },
        },
        update: expect.objectContaining({
          isCompleted: false,
          completedAt: null,
        }),
        create: expect.objectContaining({
          isCompleted: false,
          completedAt: null,
        }),
      });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateLessonProgress('nonexistent', 'l1', true),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateLessonProgress('nonexistent', 'l1', true),
      ).rejects.toThrow('Enrollment with id "nonexistent" not found');
    });

    it('should throw NotFoundException if lesson is not in the course', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());

      await expect(
        service.updateLessonProgress('e1', 'nonexistent-lesson', true),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());

      await expect(
        service.updateLessonProgress('e1', 'nonexistent-lesson', true),
      ).rejects.toThrow('Lesson "nonexistent-lesson" not found in course "c1"');
    });

    it('should recalculate enrollment progress after update', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());
      mockPrisma.courseProgress.upsert.mockResolvedValue({ id: 'p1' });

      // recalculate: 2 of 3 lessons completed
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(
        makeEnrollment({
          progress: [
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: false },
          ],
        }),
      );
      mockPrisma.courseEnrollment.update.mockResolvedValue({});

      await service.updateLessonProgress('e1', 'l1', true);

      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { progressPercent: 67 }, // Math.round(2/3 * 100) = 67
      });
    });

    it('should handle recalculation when enrollment not found (no-op)', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());
      mockPrisma.courseProgress.upsert.mockResolvedValue({ id: 'p1' });

      // recalculate: enrollment deleted between calls
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(null);

      await service.updateLessonProgress('e1', 'l1', true);

      expect(mockPrisma.courseEnrollment.update).not.toHaveBeenCalled();
    });

    it('should calculate 100% when all lessons completed', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(makeEnrollment());
      mockPrisma.courseProgress.upsert.mockResolvedValue({ id: 'p1' });

      // recalculate: all 3 lessons completed
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(
        makeEnrollment({
          progress: [
            { isCompleted: true },
            { isCompleted: true },
            { isCompleted: true },
          ],
        }),
      );
      mockPrisma.courseEnrollment.update.mockResolvedValue({});

      await service.updateLessonProgress('e1', 'l1', true);

      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { progressPercent: 100 },
      });
    });

    it('should set progress to 0% when course has no lessons', async () => {
      const enrollmentNoLessons = makeEnrollment({
        course: {
          sections: [{ lessons: [{ id: 'l1' }] }], // need l1 for the lesson check to pass
        },
      });
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(enrollmentNoLessons);
      mockPrisma.courseProgress.upsert.mockResolvedValue({ id: 'p1' });

      // recalculate: course now has no lessons (edge case)
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(
        makeEnrollment({
          course: { sections: [] },
          progress: [],
        }),
      );
      mockPrisma.courseEnrollment.update.mockResolvedValue({});

      await service.updateLessonProgress('e1', 'l1', true);

      expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { progressPercent: 0 },
      });
    });
  });

  // ─── getLessonProgress ─────────────────────────────────────────────

  describe('getLessonProgress', () => {
    it('should return lesson progress', async () => {
      const progress = {
        id: 'p1',
        enrollmentId: 'e1',
        lessonId: 'l1',
        isCompleted: true,
      };
      mockPrisma.courseProgress.findUnique.mockResolvedValue(progress);

      const result = await service.getLessonProgress('e1', 'l1');

      expect(result).toEqual(progress);
      expect(mockPrisma.courseProgress.findUnique).toHaveBeenCalledWith({
        where: {
          enrollmentId_lessonId: { enrollmentId: 'e1', lessonId: 'l1' },
        },
      });
    });

    it('should throw NotFoundException if progress does not exist', async () => {
      mockPrisma.courseProgress.findUnique.mockResolvedValue(null);

      await expect(service.getLessonProgress('e1', 'l1')).rejects.toThrow(NotFoundException);
      await expect(service.getLessonProgress('e1', 'l1')).rejects.toThrow(
        'Progress not found for enrollment "e1" and lesson "l1"',
      );
    });
  });

  // ─── getEnrollmentProgress ─────────────────────────────────────────

  describe('getEnrollmentProgress', () => {
    it('should return full enrollment progress summary', async () => {
      const enrollment = {
        id: 'e1',
        courseId: 'c1',
        progressPercent: 67,
        progress: [
          { isCompleted: true, lesson: { id: 'l1', title: 'L1' } },
          { isCompleted: true, lesson: { id: 'l2', title: 'L2' } },
          { isCompleted: false, lesson: { id: 'l3', title: 'L3' } },
        ],
        course: {
          sections: [
            { lessons: [{ id: 'l1' }, { id: 'l2' }] },
            { lessons: [{ id: 'l3' }] },
          ],
        },
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(enrollment);

      const result = await service.getEnrollmentProgress('e1');

      expect(result).toEqual({
        enrollmentId: 'e1',
        courseId: 'c1',
        overallProgress: 67,
        completedLessons: 2,
        totalLessons: 3,
        lessonProgress: enrollment.progress,
      });
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getEnrollmentProgress('nonexistent'),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getEnrollmentProgress('nonexistent'),
      ).rejects.toThrow('Enrollment with id "nonexistent" not found');
    });

    it('should handle enrollment with zero lessons', async () => {
      const enrollment = {
        id: 'e1',
        courseId: 'c1',
        progressPercent: 0,
        progress: [],
        course: { sections: [] },
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValueOnce(enrollment);

      const result = await service.getEnrollmentProgress('e1');

      expect(result.completedLessons).toBe(0);
      expect(result.totalLessons).toBe(0);
    });
  });
});
