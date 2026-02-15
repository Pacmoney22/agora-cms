import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { hasMinimumRole } from '@agora-cms/shared';

/**
 * CourseAdminGuard - Verifies user has course administration access
 *
 * Grants access if:
 * 1. User has admin+ global role (hierarchy >= 4), OR
 * 2. User has course_administrator scoped role (full LMS access)
 *
 * Usage: @UseGuards(JwtAuthGuard, CourseAdminGuard)
 */
@Injectable()
export class CourseAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role;

    if (!userRole) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admins and super_admins always have access
    if (hasMinimumRole(userRole, 'admin')) {
      return true;
    }

    // Course administrators have full LMS access
    if (userRole === 'course_administrator') {
      return true;
    }

    throw new ForbiddenException('Access denied: requires course administrator or admin privileges');
  }
}
