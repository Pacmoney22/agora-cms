import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CertificatesService } from '../certificates/certificates.service';

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
    const { userId, courseId, status, page = 1, limit = 20 } = options;
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

    const completed = await this.prisma.courseEnrollment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    this.logger.log(`Enrollment completed: ${id}`);

    // Auto-generate certificate
    try {
      await this.certificatesService.generateCertificate(id);
      this.logger.log(`Certificate auto-generated for enrollment ${id}`);
    } catch (error) {
      this.logger.error(`Failed to auto-generate certificate for enrollment ${id}`, error);
      // Don't fail the completion if certificate generation fails
    }

    return completed;
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
