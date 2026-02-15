import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { CourseAdminGuard } from './course-admin.guard';

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
    if (userH < 0) return false;
    return userH >= reqH;
  }),
}));

describe('CourseAdminGuard', () => {
  let guard: CourseAdminGuard;

  const createMockContext = (user: any = null): ExecutionContext => {
    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new CourseAdminGuard();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user role is missing', () => {
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User not authenticated');
  });

  it('should throw ForbiddenException if user has no role property', () => {
    const context = createMockContext({ sub: 'u1' }); // no role

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User not authenticated');
  });

  it('should allow admin access', () => {
    const context = createMockContext({ sub: 'u1', role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow super_admin access', () => {
    const context = createMockContext({ sub: 'u1', role: 'super_admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow course_administrator access', () => {
    const context = createMockContext({ sub: 'u1', role: 'course_administrator' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny editor access', () => {
    const context = createMockContext({ sub: 'u1', role: 'editor' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Access denied: requires course administrator or admin privileges',
    );
  });

  it('should deny viewer access', () => {
    const context = createMockContext({ sub: 'u1', role: 'viewer' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny customer access', () => {
    const context = createMockContext({ sub: 'u1', role: 'customer' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny instructor access (scoped role, not course admin)', () => {
    const context = createMockContext({ sub: 'u1', role: 'instructor' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny moderator access', () => {
    const context = createMockContext({ sub: 'u1', role: 'moderator' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
