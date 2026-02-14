import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Kafka, Producer } from 'kafkajs';
import { EVENTS, type ProductDto, type ProductVariant } from '@agora-cms/shared';
import { ProductService } from '../products/product.service';

export interface InventoryLevel {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  isLowStock: boolean;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private kafkaProducer: Producer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly productService: ProductService,
  ) {
    this.initKafka();
  }

  private async initKafka(): Promise<void> {
    const brokers = this.config.get<string>('KAFKA_BROKERS');
    if (brokers) {
      const kafka = new Kafka({
        clientId: 'commerce-service-inventory',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
    }
  }

  async getInventory(productId: string): Promise<InventoryLevel[]> {
    const product = await this.productService.findById(productId);
    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    return product.variants.map((v) => ({
      productId,
      variantId: v.variantId,
      sku: v.sku,
      quantity: v.inventory.quantity,
      lowStockThreshold: v.inventory.lowStockThreshold,
      allowBackorder: v.inventory.allowBackorder,
      isLowStock: v.inventory.tracked && v.inventory.quantity <= v.inventory.lowStockThreshold,
    }));
  }

  async updateVariantInventory(
    productId: string,
    variantId: string,
    dto: { quantity: number; allowBackorder?: boolean; lowStockThreshold?: number },
  ): Promise<InventoryLevel> {
    const product = await this.productService.findById(productId);
    const variants = product.variants ?? [];
    const idx = variants.findIndex((v) => v.variantId === variantId);
    if (idx === -1) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    variants[idx]!.inventory.quantity = dto.quantity;
    if (dto.allowBackorder !== undefined) {
      variants[idx]!.inventory.allowBackorder = dto.allowBackorder;
    }
    if (dto.lowStockThreshold !== undefined) {
      variants[idx]!.inventory.lowStockThreshold = dto.lowStockThreshold;
    }

    await this.productService.update(productId, {} as any);

    const level: InventoryLevel = {
      productId,
      variantId,
      sku: variants[idx]!.sku,
      quantity: variants[idx]!.inventory.quantity,
      lowStockThreshold: variants[idx]!.inventory.lowStockThreshold,
      allowBackorder: variants[idx]!.inventory.allowBackorder,
      isLowStock:
        variants[idx]!.inventory.tracked &&
        variants[idx]!.inventory.quantity <= variants[idx]!.inventory.lowStockThreshold,
    };

    // Publish events
    await this.publishEvent(EVENTS.INVENTORY_UPDATED, {
      productId,
      variantId,
      sku: level.sku,
      quantity: level.quantity,
    });

    if (level.isLowStock) {
      await this.publishEvent(EVENTS.INVENTORY_LOW, {
        productId,
        variantId,
        sku: level.sku,
        quantity: level.quantity,
        threshold: level.lowStockThreshold,
      });
    }

    this.logger.log(`Inventory updated: ${level.sku} -> ${level.quantity}`);
    return level;
  }

  async getLowStockItems(threshold?: number): Promise<InventoryLevel[]> {
    // In production this would be a direct DB query; for now, scan all products
    const { data: products } = await this.productService.findAll({ limit: 1000 });
    const lowStock: InventoryLevel[] = [];

    for (const product of products) {
      if (!product.variants) continue;
      for (const v of product.variants) {
        if (!v.inventory.tracked) continue;
        const effectiveThreshold = threshold ?? v.inventory.lowStockThreshold;
        if (v.inventory.quantity <= effectiveThreshold) {
          lowStock.push({
            productId: product.id,
            variantId: v.variantId,
            sku: v.sku,
            quantity: v.inventory.quantity,
            lowStockThreshold: v.inventory.lowStockThreshold,
            allowBackorder: v.inventory.allowBackorder,
            isLowStock: true,
          });
        }
      }
    }

    return lowStock;
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
}
