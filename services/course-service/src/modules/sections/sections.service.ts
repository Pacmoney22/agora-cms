import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class SectionsService {
  private readonly logger = new Logger(SectionsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findByCourseId(courseId: string) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with id "${courseId}" not found`);
    }

    return this.prisma.courseSection.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      include: {
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            videoUrl: true,
            videoDuration: true,
            position: true,
          },
        },
      },
    });
  }

  async create(courseId: string, dto: CreateSectionDto) {
    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with id "${courseId}" not found`);
    }

    // If position not provided, add to end
    let position = dto.position;
    if (position === undefined) {
      const lastSection = await this.prisma.courseSection.findFirst({
        where: { courseId },
        orderBy: { position: 'desc' },
      });
      position = lastSection ? lastSection.position + 1 : 0;
    }

    const section = await this.prisma.courseSection.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        position,
      },
    });

    this.logger.log(`Section created: ${section.id} (${section.title}) in course ${courseId}`);
    return section;
  }

  async update(id: string, dto: Partial<CreateSectionDto>) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Section with id "${id}" not found`);
    }

    const updated = await this.prisma.courseSection.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });

    this.logger.log(`Section updated: ${id}`);
    return updated;
  }

  async remove(id: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Section with id "${id}" not found`);
    }

    await this.prisma.courseSection.delete({ where: { id } });
    this.logger.log(`Section deleted: ${id}`);
  }
}
