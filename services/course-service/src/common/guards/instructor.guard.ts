import { hasMinimumRole } from '@agora-cms/shared';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * InstructorGuard - Verifies user has instructor access to a course section
 *
 * Grants access if:
 * 1. User has admin+ global role (hierarchy >= 4), OR
 * 2. User has course_administrator scoped role (full LMS access), OR
 * 3. User has instructor role AND has InstructorAssignment for the course section
 *
 * Usage: @UseGuards(JwtAuthGuard, InstructorGuard)
 *
 * Expects: request.params.sectionId or request.params.courseId
 */
@Injectable()
export class InstructorGuard implements CanActivate {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const userRole = request.user?.role;

    if (!userId || !userRole) {
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

    // Instructors must have assignment
    if (userRole !== 'instructor') {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    // Extract sectionId from params (or resolve from courseId if needed)
    const sectionId = request.params.sectionId;
    const courseId = request.params.courseId;

    const targetSectionId = sectionId;

    // If only courseId provided, check if instructor has ANY section assignment for this course
    if (!targetSectionId && courseId) {
      const sections = await this.prisma.courseSection.findMany({
        where: { courseId },
        select: { id: true },
      });

      const assignment = await this.prisma.instructorAssignment.findFirst({
        where: {
          userId,
          courseSectionId: { in: sections.map(s => s.id) },
        },
      });

      if (!assignment) {
        throw new ForbiddenException('You are not assigned as an instructor for any section in this course');
      }

      return true;
    }

    if (!targetSectionId) {
      throw new ForbiddenException('Section ID is required');
    }

    // Verify instructor assignment
    const assignment = await this.prisma.instructorAssignment.findFirst({
      where: {
        userId,
        courseSectionId: targetSectionId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned as an instructor for this course section');
    }

    request.instructorAssignment = assignment;
    return true;
  }
}
