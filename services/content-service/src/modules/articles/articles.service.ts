import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient, PageStatus } from '@prisma/client';

export interface CreateArticleDto {
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  status?: PageStatus;
}

export interface UpdateArticleDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  featuredImage?: string;
  category?: string;
  tags?: string[];
  status?: PageStatus;
}

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = Number(options.page) || 1;
    const limit = Math.min(Number(options.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.category) {
      where.category = options.category;
    }
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { excerpt: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

    const allowedSortFields = ['createdAt', 'updatedAt', 'publishedAt', 'title'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: sortOrder },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    return article;
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with slug "${slug}" not found`);
    }

    return article;
  }

  async create(dto: CreateArticleDto, userId: string) {
    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt ?? null,
        body: dto.body ?? null,
        featuredImage: dto.featuredImage ?? null,
        category: dto.category ?? null,
        tags: dto.tags ?? [],
        status: dto.status ?? 'draft',
        createdBy: userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Article created: ${article.id} "${article.title}"`);
    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.featuredImage !== undefined) data.featuredImage = dto.featuredImage;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const article = await this.prisma.article.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Article updated: ${article.id} "${article.title}"`);
    return article;
  }

  async delete(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    await this.prisma.article.delete({ where: { id } });
    this.logger.log(`Article deleted: ${id}`);
  }
}
