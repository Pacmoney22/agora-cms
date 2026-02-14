import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.navigation.findMany({
      orderBy: { location: 'asc' },
    });
  }

  async findByLocation(location: string) {
    const nav = await this.prisma.navigation.findUnique({
      where: { location },
    });

    if (!nav) {
      throw new NotFoundException(`Navigation for location "${location}" not found`);
    }

    return nav;
  }

  async upsert(location: string, items: unknown[]) {
    const nav = await this.prisma.navigation.upsert({
      where: { location },
      create: { location, items: items as any },
      update: { items: items as any },
    });

    this.logger.log(`Navigation updated for location: ${location} (${(items as any[]).length} items)`);
    return nav;
  }

  async delete(location: string) {
    const nav = await this.prisma.navigation.findUnique({
      where: { location },
    });

    if (!nav) {
      throw new NotFoundException(`Navigation for location "${location}" not found`);
    }

    await this.prisma.navigation.delete({ where: { location } });
    this.logger.log(`Navigation deleted for location: ${location}`);
  }
}
