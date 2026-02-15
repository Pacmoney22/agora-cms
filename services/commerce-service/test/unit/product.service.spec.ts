import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock external modules before importing the service
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    search: jest.fn().mockResolvedValue({
      hits: { hits: [], total: { value: 0 } },
    }),
  })),
}));

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

jest.mock('@agora-cms/shared', () => ({
  generateSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  PRODUCT_TYPE_REQUIRES_SHIPPING: {
    physical: true,
    virtual: false,
    service: false,
    configurable: false,
    course: false,
    affiliate: false,
    printful: true,
  },
  EVENTS: {
    PRODUCT_CREATED: 'product.created',
    PRODUCT_UPDATED: 'product.updated',
    PRODUCT_DELETED: 'product.deleted',
  },
}));

import { ProductService } from '../../src/modules/products/product.service';

describe('ProductService', () => {
  let service: ProductService;

  const mockProduct = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product',
    shortDescription: 'Test',
    type: 'physical',
    status: 'draft',
    pricing: {
      currency: 'USD',
      basePrice: 1999,
      salePrice: null,
      salePriceStart: null,
      salePriceEnd: null,
      pricingModel: 'one_time',
      recurringInterval: null,
      taxCategory: 'standard',
    },
    shipping: { weight: 500, dimensions: null },
    digital: null,
    service: null,
    configuration: null,
    course: null,
    affiliate: null,
    printful: null,
    variantAttrs: null,
    variants: null,
    images: [],
    seo: null,
    tags: [],
    relatedProducts: [],
    crossSells: [],
    upSells: [],
    categories: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productCategory: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      // Return undefined so ES and Kafka are disabled in unit tests
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a physical product successfully', async () => {
      const dto = {
        sku: 'SKU-001',
        name: 'Test Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };

      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('prod-1');
      expect(result.sku).toBe('SKU-001');
      expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for physical product without shipping', async () => {
      const dto = {
        sku: 'SKU-002',
        name: 'No Shipping Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        // no shipping field
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for virtual product without digital info', async () => {
      const dto = {
        sku: 'SKU-003',
        name: 'Virtual Product',
        type: 'virtual' as any,
        pricing: {
          currency: 'USD',
          basePrice: 999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for service product without service config', async () => {
      const dto = {
        sku: 'SKU-004',
        name: 'Service Product',
        type: 'service' as any,
        pricing: {
          currency: 'USD',
          basePrice: 5000,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for configurable product without steps', async () => {
      const dto = {
        sku: 'SKU-005',
        name: 'Configurable Product',
        type: 'configurable' as any,
        pricing: {
          currency: 'USD',
          basePrice: 2000,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for course product without courseId', async () => {
      const dto = {
        sku: 'SKU-006',
        name: 'Course Product',
        type: 'course' as any,
        pricing: {
          currency: 'USD',
          basePrice: 4999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should create category associations if provided', async () => {
      const dto = {
        sku: 'SKU-007',
        name: 'Product With Categories',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
        categories: ['cat-1', 'cat-2'],
      };

      mockPrisma.product.create.mockResolvedValue(mockProduct);
      mockPrisma.productCategory.create.mockResolvedValue({});

      await service.create(dto as any);

      expect(mockPrisma.productCategory.create).toHaveBeenCalledTimes(2);
    });

    it('should use provided slug or generate from name', async () => {
      const dto = {
        sku: 'SKU-008',
        name: 'My Product',
        slug: 'custom-slug',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };

      mockPrisma.product.create.mockResolvedValue({ ...mockProduct, slug: 'custom-slug' });

      const result = await service.create(dto as any);
      expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with defaults', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
    });

    it('should apply type filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ type: 'physical' as any });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'physical' }),
        }),
      );
    });

    it('should apply status filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ status: 'published' as any });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' }),
        }),
      );
    });

    it('should apply category filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ category: 'cat-1' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { some: { categoryId: 'cat-1' } },
          }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Test Product');
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Product',
      });

      const result = await service.update('prod-1', { name: 'Updated Product' } as any);

      expect(result.name).toBe('Updated Product');
      expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
    });

    it('should auto-generate slug when name is updated without slug', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'New Name',
        slug: 'new-name',
      });

      await service.update('prod-1', { name: 'New Name' } as any);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-name',
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await service.remove('prod-1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listVariants', () => {
    it('should return variants for a product', async () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [
          { variantId: 'v-1', sku: 'SKU-001-RED', attributes: { color: 'red' } },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithVariants);

      const result = await service.listVariants('prod-1');

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001-RED');
    });

    it('should return empty array if product has no variants', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.listVariants('prod-1');

      expect(result).toEqual([]);
    });
  });

  describe('addVariant', () => {
    it('should add a variant to a product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, variants: [] });
      mockPrisma.product.update.mockResolvedValue({});

      const dto = {
        sku: 'SKU-001-BLUE',
        attributes: { color: 'blue' },
      };

      const result = await service.addVariant('prod-1', dto as any);

      expect(result.sku).toBe('SKU-001-BLUE');
      expect(result.variantId).toBe('test-uuid-1234');
      expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateVariant', () => {
    it('should update an existing variant', async () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [
          {
            variantId: 'v-1',
            sku: 'SKU-001-RED',
            attributes: { color: 'red' },
            priceOverride: null,
            salePrice: null,
            inventory: { tracked: true, quantity: 10, lowStockThreshold: 5, allowBackorder: false },
            weight: null,
            dimensions: null,
            images: [],
            status: 'active',
            barcode: null,
          },
        ],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithVariants);
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.updateVariant('prod-1', 'v-1', {
        sku: 'SKU-001-RED-UPDATED',
      } as any);

      expect(result.sku).toBe('SKU-001-RED-UPDATED');
      expect(result.variantId).toBe('v-1');
    });

    it('should throw NotFoundException for non-existent variant', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, variants: [] });

      await expect(
        service.updateVariant('prod-1', 'nonexistent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateVariants', () => {
    it('should generate variants from variant attributes', async () => {
      const productWithAttrs = {
        ...mockProduct,
        sku: 'SKU-001',
        variantAttrs: [
          { slug: 'color', values: ['red', 'blue'] },
          { slug: 'size', values: ['S', 'M'] },
        ],
        variants: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithAttrs);
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.generateVariants('prod-1', {});

      expect(result).toHaveLength(4); // 2 colors * 2 sizes
    });

    it('should throw BadRequestException when no variant attrs defined', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        variantAttrs: [],
      });

      await expect(
        service.generateVariants('prod-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply skuPattern when provided', async () => {
      const productWithAttrs = {
        ...mockProduct,
        sku: 'BASE',
        variantAttrs: [
          { slug: 'color', values: ['red'] },
        ],
        variants: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithAttrs);
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.generateVariants('prod-1', {
        skuPattern: '{base}-{color}',
      });

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('BASE-red');
    });
  });

  describe('configureProduct', () => {
    const configurableProduct = {
      ...mockProduct,
      type: 'configurable',
      sku: 'CFG-001',
      configuration: {
        pricingStrategy: 'additive',
        resolvedProductType: 'physical',
        steps: [
          {
            stepId: 'step1',
            required: true,
            options: [
              { optionId: 'opt1', priceModifier: 500, sku_fragment: 'OPT1' },
              { optionId: 'opt2', priceModifier: 1000, sku_fragment: 'OPT2' },
            ],
          },
          {
            stepId: 'step2',
            required: false,
            options: [
              { optionId: 'opt3', priceModifier: 200, sku_fragment: 'OPT3' },
            ],
          },
        ],
      },
      pricing: { basePrice: 2000 },
    };

    it('should resolve configurable product with additive pricing', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(configurableProduct);

      const result = await service.configureProduct('prod-1', {
        selections: [
          { stepId: 'step1', optionId: 'opt1' },
        ],
      });

      expect(result.resolvedPrice).toBe(2500); // 2000 + 500
      expect(result.resolvedSku).toBe('CFG-001-OPT1');
      expect(result.resolvedType).toBe('physical');
    });

    it('should throw BadRequestException when product is not configurable', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.configureProduct('prod-1', { selections: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required step is missing', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(configurableProduct);

      await expect(
        service.configureProduct('prod-1', { selections: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid option', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(configurableProduct);

      await expect(
        service.configureProduct('prod-1', {
          selections: [{ stepId: 'step1', optionId: 'invalid' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle override pricing strategy', async () => {
      const overrideProduct = {
        ...configurableProduct,
        configuration: {
          ...configurableProduct.configuration,
          pricingStrategy: 'override',
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(overrideProduct);

      const result = await service.configureProduct('prod-1', {
        selections: [{ stepId: 'step1', optionId: 'opt1' }],
      });

      expect(result.resolvedPrice).toBe(500); // override with modifier
    });

    it('should handle tiered pricing strategy', async () => {
      const tieredProduct = {
        ...configurableProduct,
        configuration: {
          ...configurableProduct.configuration,
          pricingStrategy: 'tiered',
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(tieredProduct);

      const result = await service.configureProduct('prod-1', {
        selections: [{ stepId: 'step1', optionId: 'opt1' }],
      });

      expect(result.resolvedPrice).toBe(2500); // basePrice + modifier
    });
  });

  describe('searchProducts', () => {
    it('should throw BadRequestException when ES is not configured', async () => {
      await expect(
        service.searchProducts({ search: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should search products via Elasticsearch when available', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              { _source: { id: 'prod-1', name: 'Test', sku: 'SKU-001' } },
            ],
            total: { value: 1 },
          },
        }),
        index: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      };
      (service as any).esClient = mockEsClient;

      const result = await service.searchProducts({ search: 'test', page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    });

    it('should apply type and status filters in ES search', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [], total: { value: 0 } },
        }),
        index: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      };
      (service as any).esClient = mockEsClient;

      await service.searchProducts({
        search: 'test',
        type: 'physical' as any,
        status: 'published' as any,
        category: 'cat-1',
      });

      const searchCall = mockEsClient.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toHaveLength(3);
    });
  });

  describe('Elasticsearch and Kafka integration paths', () => {
    it('should index to Elasticsearch when ES client is available', async () => {
      const mockEsClient = {
        index: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        search: jest.fn(),
      };
      (service as any).esClient = mockEsClient;

      const dto = {
        sku: 'SKU-ES',
        name: 'ES Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      await service.create(dto as any);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'products', id: 'prod-1' }),
      );
    });

    it('should handle Elasticsearch indexing failure gracefully', async () => {
      const mockEsClient = {
        index: jest.fn().mockRejectedValue(new Error('ES error')),
        delete: jest.fn(),
        search: jest.fn(),
      };
      (service as any).esClient = mockEsClient;

      const dto = {
        sku: 'SKU-ESFAIL',
        name: 'ES Fail Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      // Should not throw even though ES indexing fails
      const result = await service.create(dto as any);
      expect(result.id).toBe('prod-1');
    });

    it('should publish events to Kafka when producer is available', async () => {
      const mockKafkaProducer = {
        send: jest.fn().mockResolvedValue(undefined),
      };
      (service as any).kafkaProducer = mockKafkaProducer;

      const dto = {
        sku: 'SKU-KAFKA',
        name: 'Kafka Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      await service.create(dto as any);

      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'commerce.events' }),
      );
    });

    it('should handle Kafka publish failure gracefully', async () => {
      const mockKafkaProducer = {
        send: jest.fn().mockRejectedValue(new Error('Kafka error')),
      };
      (service as any).kafkaProducer = mockKafkaProducer;

      const dto = {
        sku: 'SKU-KFAIL',
        name: 'Kafka Fail Product',
        type: 'physical' as any,
        pricing: {
          currency: 'USD',
          basePrice: 1999,
          pricingModel: 'one_time',
          taxCategory: 'standard',
        },
        shipping: { weight: 500 },
      };
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      // Should not throw even though Kafka fails
      const result = await service.create(dto as any);
      expect(result.id).toBe('prod-1');
    });

    it('should delete from ES when removing a product with ES enabled', async () => {
      const mockEsClient = {
        index: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        search: jest.fn(),
      };
      (service as any).esClient = mockEsClient;
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await service.remove('prod-1');

      expect(mockEsClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'products', id: 'prod-1' }),
      );
    });

    it('should use ES for findAll when search term provided and ES available', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [], total: { value: 0 } },
        }),
        index: jest.fn(),
        delete: jest.fn(),
      };
      (service as any).esClient = mockEsClient;

      await service.findAll({ search: 'laptop' });

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      // Prisma findMany should NOT be called when ES handles search
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });
  });
});
