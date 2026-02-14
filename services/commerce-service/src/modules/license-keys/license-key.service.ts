import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface LicenseKeyDto {
  id: string;
  poolId: string;
  keyValue: string;
  status: 'available' | 'allocated' | 'revoked';
  orderId: string | null;
  allocatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface LicenseKeyPoolDto {
  id: string;
  productId: string;
  name: string;
  totalKeys: number;
  availableKeys: number;
  createdAt: string;
}

export interface CreateLicenseKeyPoolDto {
  productId: string;
  name: string;
}

@Injectable()
export class LicenseKeyService {
  private readonly logger = new Logger(LicenseKeyService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  async createPool(dto: CreateLicenseKeyPoolDto): Promise<LicenseKeyPoolDto> {
    const pool = await this.prisma.licenseKeyPool.create({
      data: {
        productId: dto.productId,
        name: dto.name,
      },
      include: {
        keys: true,
      },
    });

    const result = this.toPoolDto(pool);
    this.logger.log(`License key pool created: ${pool.name} (${pool.id})`);
    return result;
  }

  async listPools(productId?: string): Promise<LicenseKeyPoolDto[]> {
    const where = productId ? { productId } : {};
    const rows = await this.prisma.licenseKeyPool.findMany({
      where,
      include: { keys: true },
    });
    return rows.map((r: any) => this.toPoolDto(r));
  }

  async addKeysToPool(poolId: string, keys: string[]): Promise<{ added: number; total: number }> {
    const pool = await this.prisma.licenseKeyPool.findUnique({
      where: { id: poolId },
      include: { keys: true },
    });
    if (!pool) throw new NotFoundException(`License key pool ${poolId} not found`);

    // Create all keys in a transaction
    await this.prisma.$transaction(
      keys.map((keyValue) =>
        this.prisma.licenseKey.create({
          data: {
            poolId,
            keyValue,
            status: 'available',
          },
        }),
      ),
    );

    // Get updated count
    const totalKeys = await this.prisma.licenseKey.count({ where: { poolId } });

    this.logger.log(`Added ${keys.length} keys to pool ${poolId}`);
    return { added: keys.length, total: totalKeys };
  }

  async claimKey(
    poolId: string,
    orderId: string,
    _lineItemId: string,
  ): Promise<LicenseKeyDto> {
    // Find an available key in the pool
    const availableKey = await this.prisma.licenseKey.findFirst({
      where: {
        poolId,
        status: 'available',
      },
    });

    if (!availableKey) {
      throw new BadRequestException(`No available license keys in pool ${poolId}`);
    }

    // Allocate the key
    const updated = await this.prisma.licenseKey.update({
      where: { id: availableKey.id },
      data: {
        status: 'allocated',
        orderId,
        allocatedAt: new Date(),
      },
    });

    const result = this.toKeyDto(updated);
    this.logger.log(`License key allocated: ${updated.id} for order ${orderId}`);
    return result;
  }

  async findKeyById(id: string): Promise<LicenseKeyDto> {
    const row = await this.prisma.licenseKey.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`License key ${id} not found`);
    return this.toKeyDto(row);
  }

  async revokeKey(id: string, _reason?: string): Promise<LicenseKeyDto> {
    const key = await this.prisma.licenseKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException(`License key ${id} not found`);

    if (key.status === 'revoked') {
      throw new BadRequestException('Key is already revoked');
    }

    const updated = await this.prisma.licenseKey.update({
      where: { id },
      data: {
        status: 'revoked',
      },
    });

    const result = this.toKeyDto(updated);
    this.logger.log(`License key revoked: ${id}`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private toKeyDto(row: any): LicenseKeyDto {
    return {
      id: row.id,
      poolId: row.poolId,
      keyValue: row.keyValue,
      status: row.status,
      orderId: row.orderId,
      allocatedAt: row.allocatedAt instanceof Date ? row.allocatedAt.toISOString() : row.allocatedAt,
      expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : row.expiresAt,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    };
  }

  private toPoolDto(row: any): LicenseKeyPoolDto {
    const keys = row.keys ?? [];
    return {
      id: row.id,
      productId: row.productId,
      name: row.name,
      totalKeys: keys.length,
      availableKeys: keys.filter((k: any) => k.status === 'available').length,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    };
  }
}
