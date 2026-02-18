import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findBySectionId(sectionId: string) {
    // Verify section exists
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with id "${sectionId}" not found`);
    }

    return this.prisma.courseLesson.findMany({
      where: { courseSectionId: sectionId },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with id "${id}" not found`);
    }

    return lesson;
  }

  async create(sectionId: string, dto: CreateLessonDto, userId?: string) {
    // Verify section exists
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(`Section with id "${sectionId}" not found`);
    }

    // If position not provided, add to end
    let position = dto.position;
    if (position === undefined) {
      const lastLesson = await this.prisma.courseLesson.findFirst({
        where: { courseSectionId: sectionId },
        orderBy: { position: 'desc' },
      });
      position = lastLesson ? lastLesson.position + 1 : 0;
    }

    const lesson = await this.prisma.courseLesson.create({
      data: {
        courseSectionId: sectionId,
        title: dto.title,
        content: dto.content || '',
        videoUrl: dto.videoUrl,
        videoDuration: dto.duration,
        position,
        lessonType: dto.type || 'video',
        isFree: dto.isFreePreview || false,
        createdBy: userId || undefined,
        attachments: dto.attachments
          ? (dto.attachments as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    this.logger.log(`Lesson created: ${lesson.id} (${lesson.title}) in section ${sectionId}`);
    return lesson;
  }

  async update(id: string, dto: Partial<CreateLessonDto>) {
    await this.findById(id);

    const updated = await this.prisma.courseLesson.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.duration !== undefined && { videoDuration: dto.duration }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isFreePreview !== undefined && { isFree: dto.isFreePreview }),
        ...(dto.type !== undefined && { lessonType: dto.type }),
        ...(dto.attachments !== undefined && {
          attachments: dto.attachments as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    this.logger.log(`Lesson updated: ${id}`);
    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.courseLesson.delete({ where: { id } });
    this.logger.log(`Lesson deleted: ${id}`);
  }
}
