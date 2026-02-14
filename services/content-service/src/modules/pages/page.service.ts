import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { generateSlug } from '@nextgen-cms/shared';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PageService {
  private readonly logger = new Logger(PageService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    isTemplate?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      isTemplate,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (isTemplate !== undefined) where.isTemplate = isTemplate;

    const [data, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          version: true,
          isTemplate: true,
          publishedAt: true,
          updatedAt: true,
          createdAt: true,
          createdBy: true,
        },
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with id "${id}" not found`);
    }
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) {
      throw new NotFoundException(`Page with slug "${slug}" not found`);
    }
    return page;
  }

  async create(dto: CreatePageDto, userId: string) {
    const slug = dto.slug || `/${generateSlug(dto.title)}`;

    const existing = await this.prisma.page.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`A page with slug "${slug}" already exists`);
    }

    const page = await this.prisma.page.create({
      data: {
        title: dto.title,
        slug,
        status: 'draft',
        componentTree: (dto.componentTree || {
          root: {
            instanceId: 'root',
            componentId: 'page-container',
            props: {},
            children: [],
          },
        }) as any,
        seo: dto.seo ? (dto.seo as object) : undefined,
        isTemplate: dto.isTemplate || false,
        templateName: dto.templateName || null,
        parentId: dto.parentId || null,
        version: 1,
        position: 0,
        createdBy: userId,
      },
    });

    this.logger.log(`Page created: ${page.id} (${page.title})`);
    return page;
  }

  async update(id: string, dto: UpdatePageDto, userId: string) {
    const existingPage = await this.findById(id);

    // Snapshot current state before updating
    await this.createVersionSnapshot(existingPage, userId);

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== existingPage.slug) {
      const slugConflict = await this.prisma.page.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (slugConflict) {
        throw new ConflictException(`A page with slug "${dto.slug}" already exists`);
      }

      // Auto-create redirect from old slug
      await this.prisma.redirect.upsert({
        where: { fromPath: existingPage.slug },
        update: { toPath: dto.slug },
        create: {
          fromPath: existingPage.slug,
          toPath: dto.slug,
          statusCode: 301,
        },
      });
    }

    const updatedPage = await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.componentTree !== undefined && { componentTree: dto.componentTree as object }),
        ...(dto.seo !== undefined && { seo: dto.seo as object }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.position !== undefined && { position: dto.position }),
        version: existingPage.version + 1,
      },
    });

    this.logger.log(`Page updated: ${id} (v${updatedPage.version})`);
    return updatedPage;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.pageVersion.deleteMany({ where: { pageId: id } });
    await this.prisma.page.delete({ where: { id } });
    this.logger.log(`Page deleted: ${id}`);
  }

  async publish(id: string) {
    const page = await this.findById(id);

    if (page.status === 'published') {
      throw new BadRequestException('Page is already published');
    }

    const published = await this.prisma.page.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    this.logger.log(`Page published: ${id}`);
    return published;
  }

  async unpublish(id: string) {
    const page = await this.findById(id);

    if (page.status !== 'published') {
      throw new BadRequestException('Page is not currently published');
    }

    const unpublished = await this.prisma.page.update({
      where: { id },
      data: { status: 'draft', publishedAt: null },
    });

    this.logger.log(`Page unpublished: ${id}`);
    return unpublished;
  }

  async getVersions(id: string) {
    await this.findById(id);
    return this.prisma.pageVersion.findMany({
      where: { pageId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        title: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async rollback(id: string, targetVersion: number, userId: string) {
    const page = await this.findById(id);

    const version = await this.prisma.pageVersion.findFirst({
      where: { pageId: id, version: targetVersion },
    });

    if (!version) {
      throw new NotFoundException(
        `Version ${targetVersion} not found for page "${id}"`,
      );
    }

    // Snapshot current state before rollback
    await this.createVersionSnapshot(page, userId);

    const rolledBack = await this.prisma.page.update({
      where: { id },
      data: {
        title: version.title,
        componentTree: version.componentTree as object,
        seo: version.seo as object,
        version: page.version + 1,
      },
    });

    this.logger.log(
      `Page rolled back: ${id} to v${targetVersion} (now v${rolledBack.version})`,
    );
    return rolledBack;
  }

  private async createVersionSnapshot(page: any, userId: string) {
    await this.prisma.pageVersion.create({
      data: {
        pageId: page.id,
        title: page.title,
        componentTree: page.componentTree,
        seo: page.seo,
        version: page.version,
        createdBy: userId,
      },
    });
    this.logger.debug(`Version snapshot created for page ${page.id} (v${page.version})`);
  }
}
