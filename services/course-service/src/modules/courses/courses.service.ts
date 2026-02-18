import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    level?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      category,
      level,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // category and level live inside courseMetadata (JSON); use AND for multiple JSON path filters
    const jsonFilters: Array<{ courseMetadata: { path: string[]; equals: string } }> = [];
    if (category) {
      jsonFilters.push({ courseMetadata: { path: ['category'], equals: category } });
    }
    if (level) {
      jsonFilters.push({ courseMetadata: { path: ['difficulty'], equals: level } });
    }
    if (jsonFilters.length > 0) {
      where.AND = jsonFilters;
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
          status: true,
          courseMetadata: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                lessonType: true,
                videoUrl: true,
                videoDuration: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with id "${id}" not found`);
    }

    return course;
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                lessonType: true,
                videoUrl: true,
                videoDuration: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with slug "${slug}" not found`);
    }

    return course;
  }

  async create(dto: CreateCourseDto, userId?: string) {
    let slug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Ensure slug uniqueness
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        thumbnailUrl: dto.thumbnail,
        courseMetadata: {
          learningObjectives: dto.objectives || [],
          prerequisites: dto.prerequisites || [],
          estimatedHours: dto.estimatedHours || 0,
          difficulty: dto.level || 'beginner',
          category: dto.category,
          tags: dto.tags || [],
        },
        status: 'draft',
        createdBy: userId || undefined,
      },
    });

    this.logger.log(`Course created: ${course.id} (${course.title})`);
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const existing = await this.findById(id);

    // Build courseMetadata update
    const metadataUpdates: any = {};
    if (dto.level !== undefined) metadataUpdates.difficulty = dto.level;
    if (dto.estimatedHours !== undefined) metadataUpdates.estimatedHours = dto.estimatedHours;
    if (dto.category !== undefined) metadataUpdates.category = dto.category;
    if (dto.tags !== undefined) metadataUpdates.tags = dto.tags;
    if (dto.objectives !== undefined) metadataUpdates.learningObjectives = dto.objectives;
    if (dto.prerequisites !== undefined) metadataUpdates.prerequisites = dto.prerequisites;
    if (dto.certificateSettings !== undefined) {
      metadataUpdates.certificateEnabled = dto.certificateSettings.certificateEnabled;
      metadataUpdates.certificateTemplateId = dto.certificateSettings.certificateTemplateId;
      metadataUpdates.completionCriteria = dto.certificateSettings.completionCriteria;
    }

    const course = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.thumbnail !== undefined && { thumbnailUrl: dto.thumbnail }),
        ...(Object.keys(metadataUpdates).length > 0 && {
          courseMetadata: {
            ...(existing.courseMetadata as any || {}),
            ...metadataUpdates,
          },
        }),
      },
    });

    this.logger.log(`Course updated: ${id}`);
    return course;
  }

  async remove(id: string) {
    await this.findById(id);

    // Check if course has enrollments
    const enrollmentCount = await this.prisma.courseEnrollment.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestException(
        `Cannot delete course with active enrollments. Found ${enrollmentCount} enrollment(s).`,
      );
    }

    await this.prisma.course.delete({ where: { id } });
    this.logger.log(`Course deleted: ${id}`);
  }

  async publish(id: string) {
    const course = await this.findById(id);

    if (course.status === 'published') {
      throw new BadRequestException('Course is already published');
    }

    // Validate course has content
    const sectionCount = await this.prisma.courseSection.count({
      where: { courseId: id },
    });

    if (sectionCount === 0) {
      throw new BadRequestException('Cannot publish course without sections');
    }

    const published = await this.prisma.course.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    this.logger.log(`Course published: ${id}`);
    return published;
  }

  async unpublish(id: string) {
    const course = await this.findById(id);

    if (course.status !== 'published') {
      throw new BadRequestException('Course is not currently published');
    }

    const unpublished = await this.prisma.course.update({
      where: { id },
      data: { status: 'draft', publishedAt: null },
    });

    this.logger.log(`Course unpublished: ${id}`);
    return unpublished;
  }
}
