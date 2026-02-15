import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { RolesGuard, ROLES_KEY } from '../../src/common/guards/roles.guard';

// Mock the @agora-cms/shared module
jest.mock('@agora-cms/shared', () => {
  const ROLE_HIERARCHY: Record<string, number> = {
    customer: 0,
    viewer: 1,
    editor: 2,
    store_manager: 3,
    admin: 4,
    super_admin: 5,
    instructor: -1,
    course_administrator: -1,
    exhibitor: -1,
    event_staff: -1,
    kiosk_user: -1,
  };

  return {
    hasMinimumRole: (userRole: string, requiredRole: string) =>
      ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole],
  };
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  const createMockContext = (user?: any) => {
    const request = { user };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;
  };

  // -----------------------------------------------------------------------
  // No roles decorator
  // -----------------------------------------------------------------------
  describe('when no roles are required', () => {
    it('should allow access when no @Roles decorator is present', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockContext({ sub: 'u1', role: 'viewer' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const context = createMockContext({ sub: 'u1', role: 'viewer' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // No user on request
  // -----------------------------------------------------------------------
  describe('when user is missing', () => {
    it('should throw ForbiddenException when no user on request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor']);

      const context = createMockContext(undefined);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor']);

      const context = createMockContext({ sub: 'u1' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // -----------------------------------------------------------------------
  // Role hierarchy checks
  // -----------------------------------------------------------------------
  describe('role hierarchy', () => {
    it('should allow super_admin to access admin endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const context = createMockContext({ sub: 'u1', role: 'super_admin' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow admin to access editor endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor']);

      const context = createMockContext({ sub: 'u1', role: 'admin' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow editor to access viewer endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['viewer']);

      const context = createMockContext({ sub: 'u1', role: 'editor' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny viewer access to editor endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor']);

      const context = createMockContext({ sub: 'u1', role: 'viewer' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny editor access to admin endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const context = createMockContext({ sub: 'u1', role: 'editor' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny customer access to viewer endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['viewer']);

      const context = createMockContext({ sub: 'u1', role: 'customer' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // -----------------------------------------------------------------------
  // Multiple required roles
  // -----------------------------------------------------------------------
  describe('multiple required roles', () => {
    it('should allow access if user meets any of the required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'editor']);

      const context = createMockContext({ sub: 'u1', role: 'editor' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user does not meet any required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'store_manager']);

      const context = createMockContext({ sub: 'u1', role: 'editor' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // -----------------------------------------------------------------------
  // Scoped roles
  // -----------------------------------------------------------------------
  describe('scoped roles', () => {
    it('should deny scoped roles access to global hierarchy endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['viewer']);

      const context = createMockContext({ sub: 'u1', role: 'instructor' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny exhibitor role access to editor endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['editor']);

      const context = createMockContext({ sub: 'u1', role: 'exhibitor' });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // -----------------------------------------------------------------------
  // ROLES_KEY export
  // -----------------------------------------------------------------------
  describe('ROLES_KEY', () => {
    it('should export ROLES_KEY constant', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });
});
