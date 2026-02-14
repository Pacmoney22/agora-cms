import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class RedirectsService {
  private readonly logger = new Logger(RedirectsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll(options: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.redirect.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.redirect.count(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async resolve(path: string) {
    const redirect = await this.prisma.redirect.findUnique({
      where: { fromPath: path },
    });

    if (!redirect) {
      return null;
    }

    return { toPath: redirect.toPath, statusCode: redirect.statusCode };
  }

  async create(dto: { fromPath: string; toPath: string; statusCode?: number }) {
    const redirect = await this.prisma.redirect.create({
      data: {
        fromPath: dto.fromPath,
        toPath: dto.toPath,
        statusCode: dto.statusCode || 301,
      },
    });

    this.logger.log(`Redirect created: ${redirect.fromPath} -> ${redirect.toPath} (${redirect.statusCode})`);
    return redirect;
  }

  async delete(id: string) {
    const redirect = await this.prisma.redirect.findUnique({ where: { id } });
    if (!redirect) {
      throw new NotFoundException(`Redirect with id "${id}" not found`);
    }

    await this.prisma.redirect.delete({ where: { id } });
    this.logger.log(`Redirect deleted: ${id}`);
  }
}
