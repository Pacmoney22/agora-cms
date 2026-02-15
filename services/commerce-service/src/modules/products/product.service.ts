import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Kafka, Producer } from 'kafkajs';
import {
  generateSlug,
  PRODUCT_TYPE_REQUIRES_SHIPPING,
  EVENTS,
  type ProductDto,
  type ProductType,
  type PaginatedResponse,
  type ProductVariant,
} from '@agora-cms/shared';
import {
  CreateProductDto,
  UpdateProductDto,
  ListProductsQueryDto,
  CreateVariantDto,
  GenerateVariantsDto,
  ConfigureProductDto,
} from './dto/create-product.dto';

const ES_INDEX = 'products';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private esClient: ElasticsearchClient | null = null;
  private kafkaProducer: Producer | null = null;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {
    this.initElasticsearch();
    this.initKafka();
  }

  // ---------------------------------------------------------------------------
  // Infrastructure bootstrap
  // ---------------------------------------------------------------------------

  private initElasticsearch(): void {
    const esNode = this.config.get<string>('ELASTICSEARCH_URL');
    if (esNode) {
      this.esClient = new ElasticsearchClient({ node: esNode });
      this.logger.log(`Elasticsearch client initialised (${esNode})`);
    } else {
      this.logger.warn('ELASTICSEARCH_URL not set -- search features disabled');
    }
  }

  private async initKafka(): Promise<void> {
    const brokers = this.config.get<string>('KAFKA_BROKERS');
    if (brokers) {
      const kafka = new Kafka({
        clientId: 'commerce-service',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
      this.logger.log('Kafka producer connected');
    } else {
      this.logger.warn('KAFKA_BROKERS not set -- event publishing disabled');
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(dto: CreateProductDto): Promise<ProductDto> {
    this.validateTypeConstraints(dto);

    const slug = dto.slug || generateSlug(dto.name);

    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        shortDescription: dto.shortDescription ?? null,
        type: dto.type,
        status: dto.status ?? 'draft',
        pricing: {
          currency: dto.pricing.currency,
          basePrice: dto.pricing.basePrice,
          salePrice: dto.pricing.salePrice ?? null,
          salePriceStart: dto.pricing.salePriceStart ?? null,
          salePriceEnd: dto.pricing.salePriceEnd ?? null,
          pricingModel: dto.pricing.pricingModel,
          recurringInterval: dto.pricing.recurringInterval ?? null,
          taxCategory: dto.pricing.taxCategory,
        } as any,
        shipping: (dto.shipping ?? undefined) as any,
        digital: (dto.digital ?? undefined) as any,
        service: dto.service
          ? ({
              ...dto.service,
              deliverables: dto.service.deliverables ?? [],
              recurringConfig: dto.service.recurringConfig ?? null,
            } as any)
          : undefined,
        configuration: (dto.configuration ?? undefined) as any,
        course: (dto.course ?? undefined) as any,
        variantAttrs: (dto.variantAttrs ?? undefined) as any,
        images: (dto.images ?? undefined) as any,
        seo: (dto.seo ?? undefined) as any,
        tags: dto.tags ?? [],
        relatedProducts: dto.relatedProducts ?? [],
        crossSells: dto.crossSells ?? [],
        upSells: dto.upSells ?? [],
      },
      include: {
        categories: { include: { category: true } },
      },
    });

    // Handle category associations if provided
    if (dto.categories?.length) {
      for (const categoryId of dto.categories) {
        await this.prisma.productCategory.create({
          data: { productId: product.id, categoryId },
        });
      }
    }

    const result = this.toProductDto(product);

    // Async side-effects
    await this.indexToElasticsearch(result);
    await this.publishEvent(EVENTS.PRODUCT_CREATED, {
      productId: product.id,
      sku: product.sku,
      type: product.type,
      status: product.status,
    });

    this.logger.log(`Product created: ${product.id} (${product.type})`);
    return result;
  }

  async findAll(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // If a text search term is provided and Elasticsearch is available, use it
    if (query.search && this.esClient) {
      return this.searchProducts(query);
    }

    // Otherwise fall back to Prisma
    const where: Record<string, unknown> = {};
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.categories = {
        some: { categoryId: query.category },
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: { categories: { include: { category: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    const data: ProductDto[] = rows.map((r: any) => this.toProductDto(r));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<ProductDto> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { categories: { include: { category: true } } },
    });
    if (!row) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return this.toProductDto(row);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    await this.findById(id); // throws if missing

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.shortDescription !== undefined) updateData.shortDescription = dto.shortDescription;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.pricing !== undefined) updateData.pricing = dto.pricing;
    if (dto.shipping !== undefined) updateData.shipping = dto.shipping;
    if (dto.digital !== undefined) updateData.digital = dto.digital;
    if (dto.service !== undefined) updateData.service = dto.service;
    if (dto.configuration !== undefined) updateData.configuration = dto.configuration;
    if (dto.course !== undefined) updateData.course = dto.course;
    if (dto.variantAttrs !== undefined) updateData.variantAttrs = dto.variantAttrs;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.seo !== undefined) updateData.seo = dto.seo;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.relatedProducts !== undefined) updateData.relatedProducts = dto.relatedProducts;
    if (dto.crossSells !== undefined) updateData.crossSells = dto.crossSells;
    if (dto.upSells !== undefined) updateData.upSells = dto.upSells;

    if (dto.name && !dto.slug) {
      updateData.slug = generateSlug(dto.name);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { categories: { include: { category: true } } },
    });

    const result = this.toProductDto(updated);

    await this.indexToElasticsearch(result);
    await this.publishEvent(EVENTS.PRODUCT_UPDATED, {
      productId: id,
      sku: updated.sku,
      type: updated.type,
      status: updated.status,
    });

    this.logger.log(`Product updated: ${id}`);
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws if missing
    await this.prisma.product.delete({ where: { id } });

    if (this.esClient) {
      await this.esClient.delete({ index: ES_INDEX, id }).catch(() => {});
    }

    await this.publishEvent(EVENTS.PRODUCT_DELETED, { productId: id });
    this.logger.log(`Product deleted: ${id}`);
  }

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  async listVariants(productId: string): Promise<ProductVariant[]> {
    const product = await this.findById(productId);
    return (product.variants as ProductVariant[]) ?? [];
  }

  async addVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    const product = await this.findById(productId);
    const variant: ProductVariant = {
      variantId: uuidv4(),
      sku: dto.sku,
      attributes: dto.attributes,
      priceOverride: dto.priceOverride ?? null,
      salePrice: dto.salePrice ?? null,
      inventory: { tracked: true, quantity: 0, lowStockThreshold: 5, allowBackorder: false },
      weight: dto.weight ?? null,
      dimensions: dto.dimensions ?? null,
      images: dto.images ?? [],
      status: 'active',
      barcode: dto.barcode ?? null,
    };

    const variants = [...((product.variants as ProductVariant[]) ?? []), variant];
    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: variants as any },
    });

    return variant;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: Partial<CreateVariantDto>,
  ): Promise<ProductVariant> {
    const product = await this.findById(productId);
    const variants = ((product.variants as ProductVariant[]) ?? []);
    const idx = variants.findIndex((v) => v.variantId === variantId);
    if (idx === -1) {
      throw new NotFoundException(`Variant ${variantId} not found on product ${productId}`);
    }

    const updated: ProductVariant = {
      ...variants[idx]!,
      ...this.stripUndefined(dto),
      variantId,
    };
    variants[idx] = updated;

    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: variants as any },
    });

    return updated;
  }

  async generateVariants(productId: string, dto: GenerateVariantsDto): Promise<ProductVariant[]> {
    const product = await this.findById(productId);
    if (!product.variantAttrs || (product.variantAttrs as any[]).length === 0) {
      throw new BadRequestException('Product has no variant attributes defined');
    }

    // Build cartesian product of all attribute values
    const attrs = product.variantAttrs as any[];
    const combinations = this.cartesian(attrs.map((a: any) => a.values.map((v: string) => ({ name: a.slug, value: v }))));

    const generated: ProductVariant[] = combinations.map((combo: any[]) => {
      const attributes: Record<string, string> = {};
      combo.forEach((c: any) => (attributes[c.name] = c.value));

      let sku: string;
      if (dto.skuPattern) {
        sku = dto.skuPattern;
        combo.forEach((c: any) => {
          sku = sku.replace(`{${c.name}}`, c.value);
        });
        sku = sku.replace('{base}', product.sku);
      } else {
        sku = `${product.sku}-${combo.map((c: any) => c.value).join('-')}`;
      }

      return {
        variantId: uuidv4(),
        sku,
        attributes,
        priceOverride: null,
        salePrice: null,
        inventory: { tracked: true, quantity: 0, lowStockThreshold: 5, allowBackorder: false },
        weight: null,
        dimensions: null,
        images: [],
        status: 'active' as const,
        barcode: null,
      };
    });

    const allVariants = [...((product.variants as ProductVariant[]) ?? []), ...generated];
    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: allVariants as any },
    });

    this.logger.log(`Generated ${generated.length} variants for product ${productId}`);
    return generated;
  }

  // ---------------------------------------------------------------------------
  // Configurable product resolution
  // ---------------------------------------------------------------------------

  async configureProduct(
    productId: string,
    dto: ConfigureProductDto,
  ): Promise<{
    resolvedSku: string;
    resolvedPrice: number;
    resolvedType: ProductType;
  }> {
    const product = await this.findById(productId);
    if (product.type !== 'configurable' || !product.configuration) {
      throw new BadRequestException('Product is not configurable');
    }

    const config = product.configuration as any;
    let totalModifier = 0;
    const skuFragments: string[] = [product.sku];

    for (const step of config.steps) {
      const selection = dto.selections.find((s) => s.stepId === step.stepId);
      if (!selection && step.required) {
        throw new BadRequestException(`Missing required configuration step: ${step.stepId}`);
      }
      if (!selection) continue;

      const optionIds = Array.isArray(selection.optionId) ? selection.optionId : [selection.optionId];
      for (const optId of optionIds) {
        const option = step.options.find((o: any) => o.optionId === optId);
        if (!option) {
          throw new BadRequestException(`Invalid option ${optId} for step ${step.stepId}`);
        }
        totalModifier += option.priceModifier;
        skuFragments.push(option.sku_fragment);
      }
    }

    const pricing = product.pricing as any;
    let resolvedPrice: number;
    switch (config.pricingStrategy) {
      case 'additive':
        resolvedPrice = pricing.basePrice + totalModifier;
        break;
      case 'override':
        resolvedPrice = totalModifier || pricing.basePrice;
        break;
      case 'tiered':
        resolvedPrice = pricing.basePrice + totalModifier;
        break;
      default:
        resolvedPrice = pricing.basePrice + totalModifier;
    }

    return {
      resolvedSku: skuFragments.join('-'),
      resolvedPrice,
      resolvedType: config.resolvedProductType,
    };
  }

  // ---------------------------------------------------------------------------
  // Elasticsearch search
  // ---------------------------------------------------------------------------

  async searchProducts(query: ListProductsQueryDto): Promise<PaginatedResponse<ProductDto>> {
    if (!this.esClient) {
      throw new BadRequestException('Search is not available (Elasticsearch not configured)');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const must: any[] = [];
    const filter: any[] = [];

    if (query.search) {
      must.push({
        multi_match: {
          query: query.search,
          fields: ['name^3', 'description', 'sku', 'tags'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (query.type) {
      filter.push({ term: { type: query.type } });
    }
    if (query.status) {
      filter.push({ term: { status: query.status } });
    }
    if (query.category) {
      filter.push({ term: { categories: query.category } });
    }

    const body = await this.esClient.search({
      index: ES_INDEX,
      body: {
        from: (page - 1) * limit,
        size: limit,
        query: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter,
          },
        },
        aggs: {
          types: { terms: { field: 'type' } },
          statuses: { terms: { field: 'status' } },
          categories: { terms: { field: 'categories', size: 50 } },
          price_ranges: {
            range: {
              field: 'pricing.basePrice',
              ranges: [
                { to: 1000 },
                { from: 1000, to: 5000 },
                { from: 5000, to: 10000 },
                { from: 10000, to: 50000 },
                { from: 50000 },
              ],
            },
          },
        },
      },
    });

    const hits = (body as any).hits?.hits ?? [];
    const total = (body as any).hits?.total?.value ?? 0;

    return {
      data: hits.map((h: any) => h._source as ProductDto),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toProductDto(row: any): ProductDto {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      description: row.description,
      shortDescription: row.shortDescription,
      type: row.type,
      status: row.status,
      pricing: row.pricing,
      shipping: row.shipping,
      digital: row.digital,
      service: row.service,
      configuration: row.configuration,
      course: row.course,
      affiliate: row.affiliate,
      printful: row.printful,
      variantAttrs: row.variantAttrs,
      variants: row.variants,
      images: row.images,
      seo: row.seo,
      categories: row.categories?.map((pc: any) => pc.categoryId) ?? [],
      tags: row.tags ?? [],
      relatedProducts: row.relatedProducts ?? [],
      crossSells: row.crossSells ?? [],
      upSells: row.upSells ?? [],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  private validateTypeConstraints(dto: CreateProductDto): void {
    if (dto.type === 'physical' && PRODUCT_TYPE_REQUIRES_SHIPPING.physical) {
      if (!dto.shipping) {
        throw new BadRequestException('Physical products require shipping information');
      }
    }

    if (dto.type === 'virtual') {
      if (!dto.digital) {
        throw new BadRequestException('Virtual products require digital delivery information');
      }
    }

    if (dto.type === 'service') {
      if (!dto.service) {
        throw new BadRequestException('Service products require service configuration');
      }
    }

    if (dto.type === 'configurable') {
      if (!dto.configuration || !dto.configuration.steps?.length) {
        throw new BadRequestException('Configurable products require at least one configuration step');
      }
    }

    if (dto.type === 'course') {
      if (!dto.course || !dto.course.courseId) {
        throw new BadRequestException('Course products require courseId');
      }
      // TODO: Validate courseId exists in course-service (HTTP call or event)
    }
  }

  private async indexToElasticsearch(product: ProductDto): Promise<void> {
    if (!this.esClient) return;
    try {
      await this.esClient.index({
        index: ES_INDEX,
        id: product.id,
        body: product,
      });
    } catch (err) {
      this.logger.error(`Failed to index product ${product.id} to Elasticsearch`, err);
    }
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.kafkaProducer) return;
    try {
      await this.kafkaProducer.send({
        topic: 'commerce.events',
        messages: [
          {
            key: (payload.productId as string) ?? uuidv4(),
            value: JSON.stringify({
              eventId: uuidv4(),
              eventType,
              timestamp: new Date().toISOString(),
              source: 'commerce-service',
              payload,
            }),
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to publish event ${eventType}`, err);
    }
  }

  private cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]],
    );
  }

  private stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }
}
