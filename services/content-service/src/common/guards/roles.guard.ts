import { hasMinimumRole, type UserRole } from '@agora-cms/shared';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access an endpoint.
 * Access is granted if the user's role meets or exceeds any of the specified roles
 * in the role hierarchy (viewer < editor < store_manager < admin < super_admin).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles decorator is applied, allow access (authentication is still required via JwtAuthGuard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      this.logger.warn('Roles guard: No user or role found on request');
      throw new ForbiddenException('Access denied: no role assigned');
    }

    // Check if user's role meets the minimum required role
    // The user needs to have at least one of the required roles in the hierarchy
    const hasRole = requiredRoles.some((requiredRole) =>
      hasMinimumRole(user.role, requiredRole),
    );

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.sub} (role: ${user.role}). Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Access denied: requires one of [${requiredRoles.join(', ')}] roles`,
      );
    }

    return true;
  }
}
