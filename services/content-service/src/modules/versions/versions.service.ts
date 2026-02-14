import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findByPageId(pageId: string, options: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.pageVersion.findMany({
        where: { pageId },
        skip,
        take: limit,
        orderBy: { version: 'desc' },
      }),
      this.prisma.pageVersion.count({ where: { pageId } }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const version = await this.prisma.pageVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundException(`Version with id "${id}" not found`);
    }

    return version;
  }

  async compare(versionAId: string, versionBId: string) {
    const [a, b] = await Promise.all([
      this.prisma.pageVersion.findUnique({ where: { id: versionAId } }),
      this.prisma.pageVersion.findUnique({ where: { id: versionBId } }),
    ]);

    if (!a) throw new NotFoundException(`Version "${versionAId}" not found`);
    if (!b) throw new NotFoundException(`Version "${versionBId}" not found`);

    return {
      versionA: { id: a.id, version: a.version, createdAt: a.createdAt },
      versionB: { id: b.id, version: b.version, createdAt: b.createdAt },
      titleChanged: a.title !== b.title,
      componentTreeChanged: JSON.stringify(a.componentTree) !== JSON.stringify(b.componentTree),
      seoChanged: JSON.stringify(a.seo) !== JSON.stringify(b.seo),
    };
  }
}
