import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';

import { EnrollmentGuard } from './enrollment.guard';

describe('EnrollmentGuard', () => {
  let guard: EnrollmentGuard;

  const mockPrisma = {
    courseEnrollment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    courseLesson: {
      findUnique: jest.fn(),
    },
    courseSection: {
      findUnique: jest.fn(),
    },
  };

  const createMockContext = (params: Record<string, string> = {}, user: any = null): ExecutionContext => {
    const request = {
      user,
      params,
      enrollment: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentGuard,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<EnrollmentGuard>(EnrollmentGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user is not authenticated', async () => {
    const context = createMockContext({ courseId: 'c1' }, null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
  });

  it('should allow access with courseId and active enrollment', async () => {
    const context = createMockContext({ courseId: 'c1' }, { sub: 'user-1' });
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'active' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.courseEnrollment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', courseId: 'c1', status: 'active' },
    });
  });

  it('should throw ForbiddenException if not enrolled', async () => {
    const context = createMockContext({ courseId: 'c1' }, { sub: 'user-1' });
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'You must be enrolled in this course to access this content',
    );
  });

  it('should resolve courseId from enrollmentId', async () => {
    const context = createMockContext({ enrollmentId: 'e1' }, { sub: 'user-1' });
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ courseId: 'c1' });
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'active' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.courseEnrollment.findUnique).toHaveBeenCalledWith({
      where: { id: 'e1' },
      select: { courseId: true },
    });
  });

  it('should throw NotFoundException if enrollment is not found when resolving courseId', async () => {
    const context = createMockContext({ enrollmentId: 'nonexistent' }, { sub: 'user-1' });
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Enrollment with id "nonexistent" not found',
    );
  });

  it('should resolve courseId from lessonId', async () => {
    const context = createMockContext({ lessonId: 'l1' }, { sub: 'user-1' });
    mockPrisma.courseLesson.findUnique.mockResolvedValue({
      section: { courseId: 'c1' },
    });
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'active' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.courseLesson.findUnique).toHaveBeenCalledWith({
      where: { id: 'l1' },
      include: { section: { select: { courseId: true } } },
    });
  });

  it('should throw NotFoundException if lesson is not found when resolving courseId', async () => {
    const context = createMockContext({ lessonId: 'nonexistent' }, { sub: 'user-1' });
    mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Lesson with id "nonexistent" not found',
    );
  });

  it('should resolve courseId from sectionId', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'user-1' });
    mockPrisma.courseSection.findUnique.mockResolvedValue({ courseId: 'c1' });
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'active' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw NotFoundException if section is not found when resolving courseId', async () => {
    const context = createMockContext({ sectionId: 'nonexistent' }, { sub: 'user-1' });
    mockPrisma.courseSection.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Section with id "nonexistent" not found',
    );
  });

  it('should throw ForbiddenException when no courseId can be determined', async () => {
    const context = createMockContext({}, { sub: 'user-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Cannot determine course for enrollment verification',
    );
  });

  it('should attach enrollment to request on success', async () => {
    const request = {
      user: { sub: 'user-1' },
      params: { courseId: 'c1' },
      enrollment: undefined as any,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const enrollment = { id: 'e1', status: 'active' };
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue(enrollment);

    await guard.canActivate(context);

    expect(request.enrollment).toEqual(enrollment);
  });

  it('should prioritize courseId from params over enrollmentId lookup', async () => {
    const context = createMockContext(
      { courseId: 'c1', enrollmentId: 'e1' },
      { sub: 'user-1' },
    );
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'e1', status: 'active' });

    await guard.canActivate(context);

    // Should not look up enrollment to resolve courseId since courseId was provided directly
    expect(mockPrisma.courseEnrollment.findUnique).not.toHaveBeenCalled();
  });
});
