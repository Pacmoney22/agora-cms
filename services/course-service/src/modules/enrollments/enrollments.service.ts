import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CertificatesService } from '../certificates/certificates.service';

import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly certificatesService: CertificatesService,
  ) {}

  async findAll(options: {
    userId?: string;
    courseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, courseId, status } = options;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              courseMetadata: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.courseEnrollment.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
        progress: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id "${id}" not found`);
    }

    return enrollment;
  }

  async create(dto: CreateEnrollmentDto) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with id "${dto.courseId}" not found`);
    }

    // Check if already enrolled
    const existing = await this.prisma.courseEnrollment.findFirst({
      where: {
        userId: dto.userId,
        courseId: dto.courseId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `User ${dto.userId} is already enrolled in course ${dto.courseId}`,
      );
    }

    const enrollment = await this.prisma.courseEnrollment.create({
      data: {
        userId: dto.userId,
        courseId: dto.courseId,
        orderId: dto.orderId ?? undefined,
        orderLineItemId: dto.orderLineItemId ?? undefined,
        expiresAt: dto.expiresAt ?? undefined,
        status: 'active',
        progressPercent: 0,
        enrolledAt: new Date(),
      },
      include: {
        course: true,
      },
    });

    this.logger.log(`Enrollment created: ${enrollment.id} (User: ${dto.userId}, Course: ${dto.courseId})`);
    return enrollment;
  }

  async cancel(id: string) {
    const enrollment = await this.findById(id);

    const cancelled = await this.prisma.courseEnrollment.update({
      where: { id },
      data: { status: 'suspended' },  // Use 'suspended' as per schema enum
    });

    this.logger.log(`Enrollment cancelled: ${id}`);
    return cancelled;
  }

  async complete(id: string) {
    const enrollment = await this.findById(id);
    const courseMetadata = (enrollment.course.courseMetadata || {}) as any;

    // Validate completion criteria if configured
    if (courseMetadata.completionCriteria) {
      await this.validateCompletionCriteria(enrollment, courseMetadata.completionCriteria);
    }

    // Mark enrollment as completed
    const completed = await this.prisma.courseEnrollment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    this.logger.log(`Enrollment completed: ${id}`);

    // Auto-generate certificate (if enabled — default true for backward compat)
    if (courseMetadata.certificateEnabled !== false) {
      await this.generateCertificateForEnrollment(id, courseMetadata);
    }

    return completed;
  }

  private async validateCompletionCriteria(enrollment: any, criteria: any) {
    this.validateProgress(enrollment, criteria);
    this.validateLessonCompletion(enrollment, criteria);
    if (criteria.requireQuizPassing) {
      await this.validateQuizPassing(enrollment, criteria);
    }
    if (criteria.requireAssignmentPassing) {
      await this.validateAssignmentPassing(enrollment);
    }
  }

  private validateProgress(enrollment: any, criteria: any) {
    if (criteria.minimumProgress != null && enrollment.progressPercent < criteria.minimumProgress) {
      throw new BadRequestException(
        `Minimum progress of ${criteria.minimumProgress}% required. Current: ${enrollment.progressPercent}%.`,
      );
    }
  }

  private validateLessonCompletion(enrollment: any, criteria: any) {
    const completedLessonIds = new Set(
      enrollment.progress
        .filter((p: any) => p.isCompleted)
        .map((p: any) => p.lessonId),
    );

    if (criteria.requireAllLessons) {
      const allLessonIds = enrollment.course.sections.flatMap(
        (s: any) => s.lessons.map((l: any) => l.id),
      );
      const incomplete = allLessonIds.filter((lid: string) => !completedLessonIds.has(lid));
      if (incomplete.length > 0) {
        throw new BadRequestException(
          `All lessons must be completed. ${incomplete.length} lesson(s) remaining.`,
        );
      }
    } else if (criteria.requiredLessonIds?.length > 0) {
      const missing = criteria.requiredLessonIds.filter(
        (lid: string) => !completedLessonIds.has(lid),
      );
      if (missing.length > 0) {
        throw new BadRequestException(
          `${missing.length} required lesson(s) not yet completed.`,
        );
      }
    }
  }

  private async validateQuizPassing(enrollment: any, criteria: any) {
    const minScore = criteria.minimumQuizScore ?? 70;
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: { enrollmentId: enrollment.id },
    });
    const courseQuizzes = await this.prisma.quiz.findMany({
      where: {
        lesson: { section: { courseId: enrollment.course.id } },
      },
      select: { id: true },
    });

    for (const quiz of courseQuizzes) {
      const bestAttempt = quizAttempts
        .filter((a) => a.quizId === quiz.id && a.passed !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

      if (!bestAttempt?.passed) {
        throw new BadRequestException(
          'All quizzes must be passed to complete this course.',
        );
      }
      if (bestAttempt.score != null && bestAttempt.totalPoints > 0) {
        const pct = (bestAttempt.score / bestAttempt.totalPoints) * 100;
        if (pct < minScore) {
          throw new BadRequestException(
            `Quiz score of ${minScore}% required. Best score: ${Math.round(pct)}%.`,
          );
        }
      }
    }
  }

  private async validateAssignmentPassing(enrollment: any) {
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { enrollmentId: enrollment.id },
    });
    const assignmentLessons = enrollment.course.sections.flatMap(
      (s: any) => s.lessons.filter((l: any) => l.lessonType === 'assignment'),
    );
    for (const lesson of assignmentLessons) {
      const bestSub = submissions
        .filter((s) => s.lessonId === lesson.id && s.passed !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      if (!bestSub?.passed) {
        throw new BadRequestException(
          'All assignments must be passed to complete this course.',
        );
      }
    }
  }

  private async generateCertificateForEnrollment(enrollmentId: string, courseMetadata: any) {
    try {
      let template: Record<string, any> | undefined;
      if (courseMetadata.certificateTemplateId) {
        const settingsRow = await this.prisma.siteSettings.findUnique({
          where: { key: 'certificate_templates' },
        });
        const templates = (settingsRow?.value as any)?.templates || [];
        template = templates.find(
          (t: any) => t.id === courseMetadata.certificateTemplateId,
        );
      }
      await this.certificatesService.generateCertificate(enrollmentId, template);
      this.logger.log(`Certificate auto-generated for enrollment ${enrollmentId}`);
    } catch (error) {
      this.logger.error(`Failed to auto-generate certificate for enrollment ${enrollmentId}`, error);
    }
  }

  async updateProgress(id: string, progress: number) {
    const enrollment = await this.findById(id);

    const updated = await this.prisma.courseEnrollment.update({
      where: { id },
      data: { progressPercent: progress },
    });

    this.logger.log(`Enrollment progress updated: ${id} (${progress}%)`);
    return updated;
  }
}
