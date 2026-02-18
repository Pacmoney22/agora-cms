import { generateSlug, type PaginatedResponse } from '@agora-cms/shared';
import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/** Shape returned to the admin dashboard (flat fields). */
export interface VenueDto {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  capacity: number | null;
  amenities: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  description: string | null;
  image: string | null;
  mapImage: string | null;
  parkingInfo: string | null;
  accessibilityInfo: string | null;
  rooms: unknown | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload the admin form sends when creating a venue. */
export interface CreateVenueDto {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  capacity?: number;
  amenities?: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  image?: string;
  mapImage?: string;
  parkingInfo?: string;
  accessibilityInfo?: string;
  rooms?: unknown;
}

export type UpdateVenueDto = Partial<CreateVenueDto>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async create(dto: CreateVenueDto): Promise<VenueDto> {
    const slug = generateSlug(dto.name);

    const venue = await this.prisma.venue.create({
      data: {
        name: dto.name,
        slug,
        address: this.buildAddressJson(dto) as any,
        capacity: dto.capacity ?? null,
        amenities: dto.amenities ?? [],
        contactInfo: this.buildContactJson(dto) as any,
        imageUrl: dto.image ?? null,
      },
    });

    const result = this.toVenueDto(venue);
    this.logger.log(`Venue created: ${venue.name} (${venue.id})`);
    return result;
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<VenueDto>> {
    const page = Number(query?.page) || 1;
    const limit = Math.min(Number(query?.limit) || 20, 100);

    const where: Record<string, unknown> = {};
    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const data: VenueDto[] = rows.map((r: any) => this.toVenueDto(r));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<VenueDto> {
    const row = await this.prisma.venue.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Venue ${id} not found`);
    }
    return this.toVenueDto(row);
  }

  async update(id: string, dto: UpdateVenueDto): Promise<VenueDto> {
    const existing = await this.prisma.venue.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Venue ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = generateSlug(dto.name);
    }

    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.amenities !== undefined) updateData.amenities = dto.amenities;
    if (dto.image !== undefined) updateData.imageUrl = dto.image;

    // Merge address JSON: start from current values, overlay provided fields
    const hasAddressFields =
      dto.address !== undefined ||
      dto.city !== undefined ||
      dto.state !== undefined ||
      dto.zip !== undefined ||
      dto.country !== undefined ||
      dto.description !== undefined ||
      dto.parkingInfo !== undefined ||
      dto.accessibilityInfo !== undefined ||
      dto.mapImage !== undefined ||
      dto.rooms !== undefined;

    if (hasAddressFields) {
      const current = (existing.address as Record<string, unknown>) ?? {};
      updateData.address = {
        street: dto.address !== undefined ? dto.address : current.street ?? null,
        city: dto.city !== undefined ? dto.city : current.city ?? null,
        state: dto.state !== undefined ? dto.state : current.state ?? null,
        zip: dto.zip !== undefined ? dto.zip : current.zip ?? null,
        country: dto.country !== undefined ? dto.country : current.country ?? null,
        description: dto.description !== undefined ? dto.description : current.description ?? null,
        parkingInfo: dto.parkingInfo !== undefined ? dto.parkingInfo : current.parkingInfo ?? null,
        accessibilityInfo: dto.accessibilityInfo !== undefined ? dto.accessibilityInfo : current.accessibilityInfo ?? null,
        mapImage: dto.mapImage !== undefined ? dto.mapImage : current.mapImage ?? null,
        rooms: dto.rooms !== undefined ? dto.rooms : current.rooms ?? null,
      };
    }

    const hasContactFields =
      dto.contactName !== undefined ||
      dto.contactEmail !== undefined ||
      dto.contactPhone !== undefined ||
      dto.website !== undefined;

    if (hasContactFields) {
      const current = (existing.contactInfo as Record<string, unknown>) ?? {};
      updateData.contactInfo = {
        name: dto.contactName !== undefined ? dto.contactName : current.name ?? null,
        email: dto.contactEmail !== undefined ? dto.contactEmail : current.email ?? null,
        phone: dto.contactPhone !== undefined ? dto.contactPhone : current.phone ?? null,
        website: dto.website !== undefined ? dto.website : current.website ?? null,
      };
    }

    const updated = await this.prisma.venue.update({
      where: { id },
      data: updateData,
    });

    const result = this.toVenueDto(updated);
    this.logger.log(`Venue updated: ${updated.name} (${id})`);
    return result;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.venue.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Venue ${id} not found`);
    }

    await this.prisma.venue.delete({ where: { id } });
    this.logger.log(`Venue deleted: ${id}`);
  }

  // -------------------------------------------------------------------------
  // Helpers – flat <-> JSON mapping
  // -------------------------------------------------------------------------

  /**
   * Build the JSONB `address` column value from the flat admin form fields.
   * Includes location-related extras: description, parkingInfo,
   * accessibilityInfo, mapImage, rooms.
   */
  private buildAddressJson(dto: CreateVenueDto | UpdateVenueDto): Record<string, unknown> {
    return {
      street: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zip: dto.zip ?? null,
      country: dto.country ?? null,
      description: dto.description ?? null,
      parkingInfo: dto.parkingInfo ?? null,
      accessibilityInfo: dto.accessibilityInfo ?? null,
      mapImage: dto.mapImage ?? null,
      rooms: dto.rooms ?? null,
    };
  }

  /**
   * Build the JSONB `contactInfo` column value from the flat admin form fields.
   */
  private buildContactJson(dto: CreateVenueDto | UpdateVenueDto): Record<string, unknown> {
    return {
      name: dto.contactName ?? null,
      email: dto.contactEmail ?? null,
      phone: dto.contactPhone ?? null,
      website: dto.website ?? null,
    };
  }

  /**
   * Flatten a Prisma Venue row back to the shape the admin dashboard expects.
   */
  private toVenueDto(row: any): VenueDto {
    const addr = (row.address as Record<string, unknown>) ?? {};
    const contact = (row.contactInfo as Record<string, unknown>) ?? {};

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: (addr.street as string) ?? null,
      city: (addr.city as string) ?? null,
      state: (addr.state as string) ?? null,
      zip: (addr.zip as string) ?? null,
      country: (addr.country as string) ?? null,
      capacity: row.capacity,
      amenities: row.amenities ?? [],
      contactName: (contact.name as string) ?? null,
      contactEmail: (contact.email as string) ?? null,
      contactPhone: (contact.phone as string) ?? null,
      website: (contact.website as string) ?? null,
      description: (addr.description as string) ?? null,
      image: row.imageUrl ?? null,
      mapImage: (addr.mapImage as string) ?? null,
      parkingInfo: (addr.parkingInfo as string) ?? null,
      accessibilityInfo: (addr.accessibilityInfo as string) ?? null,
      rooms: addr.rooms ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
