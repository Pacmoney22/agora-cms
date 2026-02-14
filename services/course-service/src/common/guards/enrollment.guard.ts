import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * EnrollmentGuard verifies that a user is enrolled in a course before accessing course content.
 *
 * Usage:
 * @UseGuards(EnrollmentGuard)
 *
 * The guard expects:
 * - req.user.sub (user ID from JWT)
 * - req.params.courseId OR req.params.enrollmentId
 *
 * It will:
 * 1. Extract the user ID from the authenticated user
 * 2. Find the course ID from params (either directly or via enrollment)
 * 3. Verify an active enrollment exists for this user and course
 * 4. Throw ForbiddenException if not enrolled or enrollment is not active
 */
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract course ID from request params
    let courseId = request.params.courseId;
    const enrollmentId = request.params.enrollmentId;
    const lessonId = request.params.lessonId;
    const sectionId = request.params.sectionId;

    // If we have an enrollmentId, get the courseId from it
    if (enrollmentId && !courseId) {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        select: { courseId: true },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment with id "${enrollmentId}" not found`);
      }

      courseId = enrollment.courseId;
    }

    // If we have a lessonId, get the courseId from it
    if (lessonId && !courseId) {
      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: lessonId },
        include: {
          section: {
            select: { courseId: true },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundException(`Lesson with id "${lessonId}" not found`);
      }

      courseId = lesson.section.courseId;
    }

    // If we have a sectionId, get the courseId from it
    if (sectionId && !courseId) {
      const section = await this.prisma.courseSection.findUnique({
        where: { id: sectionId },
        select: { courseId: true },
      });

      if (!section) {
        throw new NotFoundException(`Section with id "${sectionId}" not found`);
      }

      courseId = section.courseId;
    }

    if (!courseId) {
      throw new ForbiddenException('Cannot determine course for enrollment verification');
    }

    // Check if user is enrolled in the course
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: {
        userId,
        courseId,
        status: 'active', // Only active enrollments can access content
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access this content',
      );
    }

    // Attach enrollment to request for use in controllers
    request.enrollment = enrollment;

    return true;
  }
}
