import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { generateSlug, type PaginatedResponse } from '@agora-cms/shared';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  image: string | null;
  seo: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  position?: number;
  image?: string | null;
  seo?: Record<string, unknown> | null;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const slug = dto.slug || generateSlug(dto.name);

    // Validate parent exists if provided
    if (dto.parentId) {
      await this.findById(dto.parentId);
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        position: dto.position ?? 0,
        image: dto.image ?? null,
        seo: (dto.seo ?? undefined) as any,
      },
    });

    const result = this.toCategoryDto(category);
    this.logger.log(`Category created: ${category.name} (${category.id})`);
    return result;
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    parentId?: string | null;
  }): Promise<PaginatedResponse<CategoryDto>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;

    const where: Record<string, unknown> = {};
    if (query?.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { position: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    const data: CategoryDto[] = rows.map((r: any) => this.toCategoryDto(r));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<CategoryDto> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return this.toCategoryDto(row);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    await this.findById(id); // throws if not found

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.findById(dto.parentId);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.image !== undefined) updateData.image = dto.image;
    if (dto.seo !== undefined) updateData.seo = dto.seo;

    if (dto.name && !dto.slug) {
      updateData.slug = generateSlug(dto.name);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });

    const result = this.toCategoryDto(updated);
    this.logger.log(`Category updated: ${updated.name} (${id})`);
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws if not found

    // Check for children
    const childCount = await this.prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete category ${id}: it has ${childCount} child categories`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Category deleted: ${id}`);
  }

  // -------------------------------------------------------------------------
  // Tree helpers
  // -------------------------------------------------------------------------

  async getTree(): Promise<CategoryDto[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: { position: 'asc' },
    });
    const all = rows.map((r: any) => this.toCategoryDto(r));
    return this.buildTree(all, null);
  }

  private buildTree(categories: CategoryDto[], parentId: string | null): any[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        ...c,
        children: this.buildTree(categories, c.id),
      }));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private toCategoryDto(row: any): CategoryDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parentId,
      position: row.position,
      image: row.image,
      seo: row.seo,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
