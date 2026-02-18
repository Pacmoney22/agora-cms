import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { CertificateGeneratorService } from './certificate-generator.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly certificateGenerator: CertificateGeneratorService,
  ) {}

  async findAll(options: {
    courseId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { courseId, userId } = options;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (courseId || userId) {
      const enrollmentFilter: Record<string, unknown> = {};
      if (courseId) enrollmentFilter.courseId = courseId;
      if (userId) enrollmentFilter.userId = userId;
      where.enrollment = enrollmentFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        include: {
          enrollment: {
            include: {
              course: {
                select: { id: true, title: true, thumbnailUrl: true },
              },
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async regenerateCertificate(certificateId: string, template?: Record<string, any>) {
    const existing = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!existing) {
      throw new NotFoundException(`Certificate with id "${certificateId}" not found`);
    }

    await this.prisma.certificate.delete({ where: { id: certificateId } });
    this.logger.log(`Certificate deleted for regeneration: ${certificateId}`);

    return this.generateCertificate(existing.enrollmentId, template);
  }

  async generateCertificate(enrollmentId: string, template?: Record<string, any>) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id "${enrollmentId}" not found`);
    }

    if (enrollment.status !== 'completed') {
      throw new BadRequestException(
        'Certificate can only be generated for completed enrollments',
      );
    }

    // Check if certificate already exists (use findFirst since enrollmentId is not unique)
    const existing = await this.prisma.certificate.findFirst({
      where: { enrollmentId },
    });

    if (existing) {
      return existing;
    }

    // Generate PDF certificate
    const { certificateUrl, verificationCode } = await this.certificateGenerator.generate({
      enrollmentId,
      studentName: enrollment.user.name,
      courseTitle: enrollment.course.title,
      completedAt: enrollment.completedAt || new Date(),
      instructorName: enrollment.course.author?.name ?? 'Unknown',
      template,
    });

    const certificate = await this.prisma.certificate.create({
      data: {
        enrollmentId,
        verificationCode,
        certificateUrl,
        issuedAt: new Date(),
      },
    });

    this.logger.log(
      `Certificate generated: ${certificate.id} for enrollment ${enrollmentId}`,
    );
    return certificate;
  }

  async getCertificateByEnrollmentId(enrollmentId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { enrollmentId },
      include: {
        enrollment: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException(
        `Certificate not found for enrollment "${enrollmentId}"`,
      );
    }

    return certificate;
  }

  async verifyCertificate(verificationCode: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException(
        `Certificate with verification code "${verificationCode}" not found`,
      );
    }

    return {
      valid: true,
      certificateId: certificate.id,
      userId: certificate.enrollment.userId,
      courseTitle: certificate.enrollment.course.title,
      issuedAt: certificate.issuedAt,
      completedAt: certificate.enrollment.completedAt,
    };
  }

  async getCertificatesByUserId(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: {
        enrollment: {
          userId,
        },
      },
      include: {
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return certificates;
  }

  private generateVerificationCode(): string {
    // Generate a unique 12-character verification code
    return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
}
