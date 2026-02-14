import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    completed: boolean,
    videoProgress?: number,
  ) {
    // Verify enrollment exists
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            sections: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id "${enrollmentId}" not found`);
    }

    // Verify lesson belongs to the course
    const lessonExists = enrollment.course.sections.some((section) =>
      section.lessons.some((lesson) => lesson.id === lessonId),
    );

    if (!lessonExists) {
      throw new NotFoundException(
        `Lesson "${lessonId}" not found in course "${enrollment.courseId}"`,
      );
    }

    // Upsert lesson progress
    const progress = await this.prisma.courseProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
      update: {
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
        videoProgress: videoProgress,
        lastViewedAt: new Date(),
      },
      create: {
        enrollmentId,
        lessonId,
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
        videoProgress: videoProgress,
        lastViewedAt: new Date(),
      },
    });

    // Recalculate overall enrollment progress
    await this.recalculateEnrollmentProgress(enrollmentId);

    this.logger.log(
      `Lesson progress updated: Enrollment ${enrollmentId}, Lesson ${lessonId}, Completed: ${completed}`,
    );
    return progress;
  }

  async getLessonProgress(enrollmentId: string, lessonId: string) {
    const progress = await this.prisma.courseProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
    });

    if (!progress) {
      throw new NotFoundException(
        `Progress not found for enrollment "${enrollmentId}" and lesson "${lessonId}"`,
      );
    }

    return progress;
  }

  async getEnrollmentProgress(enrollmentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        progress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                videoUrl: true,
                courseSectionId: true,
              },
            },
          },
        },
        course: {
          include: {
            sections: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id "${enrollmentId}" not found`);
    }

    return {
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      overallProgress: enrollment.progressPercent,
      completedLessons: enrollment.progress.filter((p) => p.isCompleted).length,
      totalLessons: enrollment.course.sections.reduce(
        (acc, section) => acc + section.lessons.length,
        0,
      ),
      lessonProgress: enrollment.progress,
    };
  }

  private async recalculateEnrollmentProgress(enrollmentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        progress: true,
        course: {
          include: {
            sections: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) return;

    const totalLessons = enrollment.course.sections.reduce(
      (acc, section) => acc + section.lessons.length,
      0,
    );

    const completedLessons = enrollment.progress.filter((p) => p.isCompleted).length;

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { progressPercent: progressPercentage },
    });

    this.logger.debug(
      `Enrollment progress recalculated: ${enrollmentId} = ${progressPercentage}% (${completedLessons}/${totalLessons})`,
    );
  }
}
