import { generateSlug, type PaginatedResponse } from '@agora-cms/shared';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface EventDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueId: string | null;
  virtualEventUrl: string | null;
  isExternalRegistration: boolean;
  externalRegistrationUrl: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  maxAttendees: number | null;
  tags: string[];
  seo: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description?: string | null;
  startDate: string | Date;
  endDate: string | Date;
  timezone?: string;
  venueId?: string | null;
  virtualEventUrl?: string | null;
  isExternalRegistration?: boolean;
  externalRegistrationUrl?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  maxAttendees?: number | null;
  tags?: string[];
  seo?: Record<string, unknown> | null;
}

export type UpdateEventDto = Partial<CreateEventDto>;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async findAll(query?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<EventDto>> {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 100);

    const where: Record<string, unknown> = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    const data: EventDto[] = rows.map((r: any) => this.toEventDto(r));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<EventDto> {
    const row = await this.prisma.event.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return this.toEventDto(row);
  }

  async findBySlug(slug: string): Promise<EventDto> {
    const row = await this.prisma.event.findFirst({ where: { slug } });
    if (!row) {
      throw new NotFoundException(`Event with slug "${slug}" not found`);
    }
    return this.toEventDto(row);
  }

  async create(dto: CreateEventDto): Promise<EventDto> {
    const slug = generateSlug(dto.title);

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        timezone: dto.timezone ?? 'UTC',
        venueId: dto.venueId ?? null,
        virtualEventUrl: dto.virtualEventUrl ?? null,
        isExternalRegistration: dto.isExternalRegistration ?? false,
        externalRegistrationUrl: dto.externalRegistrationUrl ?? null,
        imageUrl: dto.imageUrl ?? null,
        bannerUrl: dto.bannerUrl ?? null,
        maxAttendees: dto.maxAttendees ?? null,
        tags: dto.tags ?? [],
        seo: (dto.seo ?? undefined) as any,
      },
    });

    const result = this.toEventDto(event);
    this.logger.log(`Event created: ${event.title} (${event.id})`);
    return result;
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventDto> {
    await this.findById(id); // throws if not found

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.venueId !== undefined) updateData.venueId = dto.venueId;
    if (dto.virtualEventUrl !== undefined) updateData.virtualEventUrl = dto.virtualEventUrl;
    if (dto.isExternalRegistration !== undefined) updateData.isExternalRegistration = dto.isExternalRegistration;
    if (dto.externalRegistrationUrl !== undefined) updateData.externalRegistrationUrl = dto.externalRegistrationUrl;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.bannerUrl !== undefined) updateData.bannerUrl = dto.bannerUrl;
    if (dto.maxAttendees !== undefined) updateData.maxAttendees = dto.maxAttendees;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.seo !== undefined) updateData.seo = dto.seo;

    if (dto.title && !updateData.slug) {
      updateData.slug = generateSlug(dto.title);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: updateData,
    });

    const result = this.toEventDto(updated);
    this.logger.log(`Event updated: ${updated.title} (${id})`);
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws if not found

    await this.prisma.event.delete({ where: { id } });
    this.logger.log(`Event deleted: ${id}`);
  }

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  async publish(id: string): Promise<EventDto> {
    await this.findById(id); // throws if not found

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    const result = this.toEventDto(updated);
    this.logger.log(`Event published: ${updated.title} (${id})`);
    return result;
  }

  async cancel(id: string): Promise<EventDto> {
    await this.findById(id); // throws if not found

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    const result = this.toEventDto(updated);
    this.logger.log(`Event cancelled: ${updated.title} (${id})`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private toEventDto(row: any): EventDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      status: row.status,
      startDate: row.startDate instanceof Date ? row.startDate.toISOString() : row.startDate,
      endDate: row.endDate instanceof Date ? row.endDate.toISOString() : row.endDate,
      timezone: row.timezone,
      venueId: row.venueId,
      virtualEventUrl: row.virtualEventUrl,
      isExternalRegistration: row.isExternalRegistration,
      externalRegistrationUrl: row.externalRegistrationUrl,
      imageUrl: row.imageUrl,
      bannerUrl: row.bannerUrl,
      maxAttendees: row.maxAttendees,
      tags: row.tags,
      seo: row.seo,
      publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
