import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async submit(lessonId: string, dto: CreateSubmissionDto) {
    // Verify lesson exists and is an assignment
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson "${lessonId}" not found`);
    }

    if (lesson.lessonType !== 'assignment') {
      throw new BadRequestException('Submissions are only accepted for assignment lessons');
    }

    // Verify enrollment exists
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: dto.enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment "${dto.enrollmentId}" not found`);
    }

    // Auto-increment submission number
    const lastSubmission = await this.prisma.assignmentSubmission.findFirst({
      where: { lessonId, enrollmentId: dto.enrollmentId },
      orderBy: { submissionNumber: 'desc' },
    });
    const submissionNumber = lastSubmission ? lastSubmission.submissionNumber + 1 : 1;

    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        lessonId,
        enrollmentId: dto.enrollmentId,
        submissionNumber,
        content: dto.content,
        links: dto.links ? (dto.links as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        totalPoints: dto.totalPoints ?? 100,
        gradingStatus: 'pending',
      },
    });

    this.logger.log(
      `Assignment submission #${submissionNumber} created: ${submission.id} for lesson ${lessonId}`,
    );
    return submission;
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        lesson: { select: { id: true, title: true, courseSectionId: true } },
        enrollment: {
          select: {
            id: true,
            userId: true,
            courseId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission "${id}" not found`);
    }

    return submission;
  }

  async getSubmissionsForLesson(lessonId: string, enrollmentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { lessonId, enrollmentId },
      orderBy: { submissionNumber: 'desc' },
    });
  }

  async gradeSubmission(id: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission "${id}" not found`);
    }

    const status = dto.status ?? 'graded';
    const passed = status === 'graded' ? dto.score / submission.totalPoints >= 0.7 : null;

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        gradedBy: dto.gradedBy,
        gradedAt: new Date(),
        gradingStatus: status,
        passed: status === 'graded' ? passed : null,
      },
    });

    this.logger.log(
      `Submission ${id} ${status}: score=${dto.score}/${submission.totalPoints}`,
    );
    return updated;
  }

  async getPendingSubmissions(instructorId?: string) {
    const where: any = { gradingStatus: 'pending' };

    // If instructorId is provided, filter to lessons in sections the instructor teaches
    // For now, return all pending submissions (auth/filtering can be added later)

    return this.prisma.assignmentSubmission.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            section: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
        enrollment: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }
}
