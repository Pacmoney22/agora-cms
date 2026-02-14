import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { PaginatedResponse } from '@agora-cms/shared';

export interface CouponDto {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number | null;
  appliesTo: string;
  productIds: string[];
  categoryIds: string[];
  productTypes: string[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  minItemCount: number | null;
  maxUsageCount: number | null;
  usagePerUser: number | null;
  currentUsage: number;
  stackable: boolean;
  stackGroup: string | null;
  priority: number;
  buyXQuantity: number | null;
  getYQuantity: number | null;
  stripeCouponId: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponDto {
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
  appliesTo?: string;
  productIds?: string[];
  categoryIds?: string[];
  productTypes?: string[];
  excludedProductIds?: string[];
  excludedCategoryIds?: string[];
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  minItemCount?: number | null;
  maxUsageCount?: number | null;
  usagePerUser?: number | null;
  stackable?: boolean;
  stackGroup?: string | null;
  priority?: number;
  buyXQuantity?: number | null;
  getYQuantity?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface ValidateContext {
  subtotal: number;
  productIds?: string[];
  categoryIds?: string[];
  productTypes?: string[];
  itemCount?: number;
  userId?: string;
  otherCouponCodes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  discount: number;
  message?: string;
  appliedTo?: 'all' | 'specific_products' | 'specific_categories';
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
  ) {}

  async create(dto: CreateCouponDto): Promise<CouponDto> {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        appliesTo: dto.appliesTo ?? 'all',
        productIds: dto.productIds ?? [],
        categoryIds: dto.categoryIds ?? [],
        productTypes: dto.productTypes ?? [],
        excludedProductIds: dto.excludedProductIds ?? [],
        excludedCategoryIds: dto.excludedCategoryIds ?? [],
        minOrderAmount: dto.minOrderAmount ?? null,
        maxOrderAmount: dto.maxOrderAmount ?? null,
        minItemCount: dto.minItemCount ?? null,
        maxUsageCount: dto.maxUsageCount ?? null,
        usagePerUser: dto.usagePerUser ?? null,
        currentUsage: 0,
        stackable: dto.stackable ?? false,
        stackGroup: dto.stackGroup ?? null,
        priority: dto.priority ?? 0,
        buyXQuantity: dto.buyXQuantity ?? null,
        getYQuantity: dto.getYQuantity ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
      },
    });

    const result = this.toCouponDto(coupon);
    this.logger.log(`Coupon created: ${coupon.code} (${coupon.id})`);
    return result;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<CouponDto>> {
    const [rows, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ]);

    return {
      data: rows.map((r: any) => this.toCouponDto(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<CouponDto> {
    const row = await this.prisma.coupon.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Coupon ${id} not found`);
    return this.toCouponDto(row);
  }

  async findByCode(code: string): Promise<CouponDto> {
    const row = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!row) throw new NotFoundException(`Coupon code "${code}" not found`);
    return this.toCouponDto(row);
  }

  async validate(
    code: string,
    context: ValidateContext,
  ): Promise<ValidationResult> {
    try {
      const coupon = await this.findByCode(code);

      // --- Basic eligibility ---
      if (!coupon.isActive) {
        return { valid: false, discount: 0, message: 'Coupon is not active' };
      }

      const now = new Date();
      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return { valid: false, discount: 0, message: 'Coupon has expired' };
      }
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return { valid: false, discount: 0, message: 'Coupon is not yet active' };
      }

      // --- Usage limits ---
      if (coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount) {
        return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
      }

      // Per-user usage check (caller must supply userId)
      if (coupon.usagePerUser && context.userId) {
        const userUsage = await this.prisma.coupon.count({
          where: { id: coupon.id },
        });
        // Note: In production, track per-user usage in a separate CouponUsage table.
        // For now, this is a placeholder for the per-user limit feature.
      }

      // --- Cart thresholds ---
      if (coupon.minOrderAmount && context.subtotal < coupon.minOrderAmount) {
        const minDisplay = (coupon.minOrderAmount / 100).toFixed(2);
        return {
          valid: false,
          discount: 0,
          message: `Minimum order amount of $${minDisplay} not met`,
        };
      }

      if (coupon.maxOrderAmount && context.subtotal > coupon.maxOrderAmount) {
        const maxDisplay = (coupon.maxOrderAmount / 100).toFixed(2);
        return {
          valid: false,
          discount: 0,
          message: `Coupon only valid for orders up to $${maxDisplay}`,
        };
      }

      if (coupon.minItemCount && (context.itemCount ?? 0) < coupon.minItemCount) {
        return {
          valid: false,
          discount: 0,
          message: `At least ${coupon.minItemCount} qualifying items required`,
        };
      }

      // --- Product type targeting ---
      if (coupon.productTypes.length > 0 && context.productTypes?.length) {
        const hasMatch = context.productTypes.some((t) => coupon.productTypes.includes(t));
        if (!hasMatch) {
          return {
            valid: false,
            discount: 0,
            message: 'Coupon does not apply to these product types',
          };
        }
      }

      // --- Product/category targeting ---
      if (coupon.appliesTo === 'specific_products' && coupon.productIds.length > 0) {
        if (!context.productIds?.length) {
          return { valid: false, discount: 0, message: 'No qualifying products in cart' };
        }
        const hasMatch = context.productIds.some((id) => coupon.productIds.includes(id));
        if (!hasMatch) {
          return { valid: false, discount: 0, message: 'Coupon does not apply to these products' };
        }
      }

      if (coupon.appliesTo === 'specific_categories' && coupon.categoryIds.length > 0) {
        if (!context.categoryIds?.length) {
          return { valid: false, discount: 0, message: 'No qualifying categories in cart' };
        }
        const hasMatch = context.categoryIds.some((id) => coupon.categoryIds.includes(id));
        if (!hasMatch) {
          return { valid: false, discount: 0, message: 'Coupon does not apply to these categories' };
        }
      }

      // --- Exclusion rules ---
      if (coupon.excludedProductIds.length > 0 && context.productIds?.length) {
        const allExcluded = context.productIds.every((id) =>
          coupon.excludedProductIds.includes(id),
        );
        if (allExcluded) {
          return { valid: false, discount: 0, message: 'All cart products are excluded from this coupon' };
        }
      }

      if (coupon.excludedCategoryIds.length > 0 && context.categoryIds?.length) {
        const allExcluded = context.categoryIds.every((id) =>
          coupon.excludedCategoryIds.includes(id),
        );
        if (allExcluded) {
          return { valid: false, discount: 0, message: 'All cart categories are excluded from this coupon' };
        }
      }

      // --- Stacking rules ---
      if (!coupon.stackable && context.otherCouponCodes?.length) {
        return {
          valid: false,
          discount: 0,
          message: 'This coupon cannot be combined with other coupons',
        };
      }

      if (coupon.stackable && coupon.stackGroup && context.otherCouponCodes?.length) {
        // Check if any other applied coupon is in the same stack group
        for (const otherCode of context.otherCouponCodes) {
          try {
            const other = await this.findByCode(otherCode);
            if (other.stackGroup === coupon.stackGroup) {
              return {
                valid: false,
                discount: 0,
                message: `Cannot combine with "${otherCode}" — same discount group`,
              };
            }
          } catch {
            // Other coupon not found, skip
          }
        }
      }

      // --- Calculate discount ---
      let discount = 0;
      switch (coupon.discountType) {
        case 'percentage':
          discount = Math.round(context.subtotal * (coupon.discountValue / 10000));
          break;
        case 'fixed_amount':
          discount = coupon.discountValue;
          break;
        case 'free_shipping':
          discount = 0; // Applied at checkout level
          break;
        case 'buy_x_get_y':
          // Discount is applied as a percentage off the Y items
          // Actual calculation depends on cart item prices — return the value as reference
          discount = coupon.discountValue; // Stored as percentage * 100 for the Y items
          break;
      }

      // Apply discount cap
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }

      // Discount should never exceed subtotal
      if (discount > context.subtotal) {
        discount = context.subtotal;
      }

      return {
        valid: true,
        discount,
        appliedTo: coupon.appliesTo as ValidationResult['appliedTo'],
      };
    } catch {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<CouponDto> {
    await this.findById(id); // throws if not found

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase();
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.discountType !== undefined) updateData.discountType = dto.discountType;
    if (dto.discountValue !== undefined) updateData.discountValue = dto.discountValue;
    if (dto.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.appliesTo !== undefined) updateData.appliesTo = dto.appliesTo;
    if (dto.productIds !== undefined) updateData.productIds = dto.productIds;
    if (dto.categoryIds !== undefined) updateData.categoryIds = dto.categoryIds;
    if (dto.productTypes !== undefined) updateData.productTypes = dto.productTypes;
    if (dto.excludedProductIds !== undefined) updateData.excludedProductIds = dto.excludedProductIds;
    if (dto.excludedCategoryIds !== undefined) updateData.excludedCategoryIds = dto.excludedCategoryIds;
    if (dto.minOrderAmount !== undefined) updateData.minOrderAmount = dto.minOrderAmount;
    if (dto.maxOrderAmount !== undefined) updateData.maxOrderAmount = dto.maxOrderAmount;
    if (dto.minItemCount !== undefined) updateData.minItemCount = dto.minItemCount;
    if (dto.maxUsageCount !== undefined) updateData.maxUsageCount = dto.maxUsageCount;
    if (dto.usagePerUser !== undefined) updateData.usagePerUser = dto.usagePerUser;
    if (dto.stackable !== undefined) updateData.stackable = dto.stackable;
    if (dto.stackGroup !== undefined) updateData.stackGroup = dto.stackGroup;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.buyXQuantity !== undefined) updateData.buyXQuantity = dto.buyXQuantity;
    if (dto.getYQuantity !== undefined) updateData.getYQuantity = dto.getYQuantity;
    if (dto.startsAt !== undefined) updateData.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return this.toCouponDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws if not found
    await this.prisma.coupon.delete({ where: { id } });
    this.logger.log(`Coupon deleted: ${id}`);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private toCouponDto(row: any): CouponDto {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      discountType: row.discountType,
      discountValue: row.discountValue,
      maxDiscountAmount: row.maxDiscountAmount ?? null,
      appliesTo: row.appliesTo ?? 'all',
      productIds: row.productIds ?? [],
      categoryIds: row.categoryIds ?? [],
      productTypes: row.productTypes ?? [],
      excludedProductIds: row.excludedProductIds ?? [],
      excludedCategoryIds: row.excludedCategoryIds ?? [],
      minOrderAmount: row.minOrderAmount,
      maxOrderAmount: row.maxOrderAmount ?? null,
      minItemCount: row.minItemCount ?? null,
      maxUsageCount: row.maxUsageCount,
      usagePerUser: row.usagePerUser ?? null,
      currentUsage: row.currentUsage,
      stackable: row.stackable ?? false,
      stackGroup: row.stackGroup ?? null,
      priority: row.priority ?? 0,
      buyXQuantity: row.buyXQuantity ?? null,
      getYQuantity: row.getYQuantity ?? null,
      stripeCouponId: row.stripeCouponId,
      startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : row.startsAt,
      expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : row.expiresAt,
      isActive: row.isActive,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
