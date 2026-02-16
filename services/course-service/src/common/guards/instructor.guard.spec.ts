import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { InstructorGuard } from './instructor.guard';

// Mock @agora-cms/shared
jest.mock('@agora-cms/shared', () => ({
  hasMinimumRole: jest.fn((userRole: string, requiredRole: string) => {
    const hierarchy: Record<string, number> = {
      customer: 0,
      viewer: 1,
      editor: 2,
      moderator: 3,
      admin: 4,
      super_admin: 5,
      // Scoped roles have hierarchy -1
      instructor: -1,
      course_administrator: -1,
    };
    const userH = hierarchy[userRole] ?? -1;
    const reqH = hierarchy[requiredRole] ?? -1;
    if (userH < 0) return false; // scoped roles always fail hierarchy check
    return userH >= reqH;
  }),
}));

describe('InstructorGuard', () => {
  let guard: InstructorGuard;

  const mockPrisma = {
    courseSection: {
      findMany: jest.fn(),
    },
    instructorAssignment: {
      findFirst: jest.fn(),
    },
  };

  const createMockContext = (params: Record<string, string> = {}, user: any = null): ExecutionContext => {
    const request = {
      user,
      params,
      instructorAssignment: undefined,
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
        InstructorGuard,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<InstructorGuard>(InstructorGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user is not authenticated', async () => {
    const context = createMockContext({}, null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
  });

  it('should throw ForbiddenException if userRole is missing', async () => {
    const context = createMockContext({}, { sub: 'user-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
  });

  it('should allow admin access without assignment', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'admin-1', role: 'admin' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.instructorAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('should allow super_admin access without assignment', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'admin-1', role: 'super_admin' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow course_administrator access without assignment', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'ca-1', role: 'course_administrator' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException for non-instructor roles', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'user-1', role: 'customer' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Access denied: insufficient permissions',
    );
  });

  it('should allow instructor with valid section assignment', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'inst-1', role: 'instructor' });
    const assignment = { id: 'ia1', userId: 'inst-1', courseSectionId: 's1' };
    mockPrisma.instructorAssignment.findFirst.mockResolvedValue(assignment);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.instructorAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'inst-1', courseSectionId: 's1' },
    });
  });

  it('should throw ForbiddenException if instructor has no section assignment', async () => {
    const context = createMockContext({ sectionId: 's1' }, { sub: 'inst-1', role: 'instructor' });
    mockPrisma.instructorAssignment.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'You are not assigned as an instructor for this course section',
    );
  });

  it('should check course-level assignment when only courseId provided', async () => {
    const context = createMockContext({ courseId: 'c1' }, { sub: 'inst-1', role: 'instructor' });
    mockPrisma.courseSection.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    mockPrisma.instructorAssignment.findFirst.mockResolvedValue({ id: 'ia1' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockPrisma.courseSection.findMany).toHaveBeenCalledWith({
      where: { courseId: 'c1' },
      select: { id: true },
    });
    expect(mockPrisma.instructorAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'inst-1', courseSectionId: { in: ['s1', 's2'] } },
    });
  });

  it('should throw ForbiddenException if instructor has no course-level assignment', async () => {
    const context = createMockContext({ courseId: 'c1' }, { sub: 'inst-1', role: 'instructor' });
    mockPrisma.courseSection.findMany.mockResolvedValue([{ id: 's1' }]);
    mockPrisma.instructorAssignment.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'You are not assigned as an instructor for any section in this course',
    );
  });

  it('should throw ForbiddenException if no sectionId or courseId provided', async () => {
    const context = createMockContext({}, { sub: 'inst-1', role: 'instructor' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('Section ID is required');
  });

  it('should attach instructorAssignment to request on success', async () => {
    const request = {
      user: { sub: 'inst-1', role: 'instructor' },
      params: { sectionId: 's1' },
      instructorAssignment: undefined as any,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const assignment = { id: 'ia1', userId: 'inst-1', courseSectionId: 's1' };
    mockPrisma.instructorAssignment.findFirst.mockResolvedValue(assignment);

    await guard.canActivate(context);

    expect(request.instructorAssignment).toEqual(assignment);
  });
});
