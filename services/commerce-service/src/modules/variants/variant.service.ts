import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { ProductDto, ProductVariant } from '@nextgen-cms/shared';

@Injectable()
export class VariantService {
  private readonly logger = new Logger(VariantService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  /**
   * Find a variant by its variantId across all products.
   */
  async findById(variantId: string): Promise<{ productId: string; variant: ProductVariant }> {
    const rows = await this.prisma.product.findMany({
      where: {
        variants: { not: { equals: null } } as any,
      },
    });

    for (const row of rows) {
      const variants = (row.variants as unknown as ProductVariant[]) ?? [];
      const variant = variants.find((v) => v.variantId === variantId);
      if (variant) {
        return { productId: row.id, variant };
      }
    }
    throw new NotFoundException(`Variant ${variantId} not found`);
  }

  /**
   * Update a variant by its variantId (searches across all products).
   */
  async updateById(variantId: string, dto: Record<string, unknown>): Promise<ProductVariant> {
    const { productId } = await this.findById(variantId);

    const row = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!row) throw new NotFoundException(`Product ${productId} not found`);

    const variants = ((row.variants as unknown as ProductVariant[]) ?? []);
    const idx = variants.findIndex((v) => v.variantId === variantId);

    const updated: ProductVariant = { ...variants[idx]!, ...dto } as ProductVariant;
    variants[idx] = updated;

    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: variants as any },
    });

    this.logger.log(`Variant updated: ${variantId} on product ${productId}`);
    return updated;
  }

  /**
   * Remove a variant by its variantId.
   */
  async removeById(variantId: string): Promise<void> {
    const { productId } = await this.findById(variantId);

    const row = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!row) throw new NotFoundException(`Product ${productId} not found`);

    const variants = ((row.variants as unknown as ProductVariant[]) ?? []).filter(
      (v) => v.variantId !== variantId,
    );

    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: variants as any },
    });

    this.logger.log(`Variant deleted: ${variantId} from product ${productId}`);
  }
}
