import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.page.findMany({
      where: { isTemplate: true },
      orderBy: { templateName: 'asc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.page.findFirst({
      where: { id, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }

    return template;
  }

  async createFromPage(pageId: string, templateName: string, userId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    const template = await this.prisma.page.create({
      data: {
        slug: `template-${templateName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        title: templateName,
        isTemplate: true,
        templateName,
        componentTree: page.componentTree ?? undefined,
        createdBy: userId,
      },
    });

    this.logger.log(`Template created: ${template.id} (${templateName}) from page ${pageId}`);
    return template;
  }

  async instantiate(templateId: string, slug: string, title: string, userId: string) {
    const template = await this.prisma.page.findFirst({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with id "${templateId}" not found`);
    }

    const page = await this.prisma.page.create({
      data: {
        slug,
        title,
        componentTree: template.componentTree ?? undefined,
        createdBy: userId,
      },
    });

    this.logger.log(`Page created from template: ${page.id} from template ${templateId}`);
    return page;
  }

  async delete(id: string) {
    const template = await this.prisma.page.findFirst({
      where: { id, isTemplate: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with id "${id}" not found`);
    }

    await this.prisma.page.delete({ where: { id } });
    this.logger.log(`Template deleted: ${id}`);
  }
}
