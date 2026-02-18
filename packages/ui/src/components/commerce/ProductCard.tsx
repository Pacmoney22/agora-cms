import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Star,
  ShoppingCart,
  Eye,
  Heart,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Download,
  Clock,
  Tag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariantData {
  variantId: string;
  sku?: string;
  attributes: Record<string, string>;
  priceOverride: number | null;
  salePrice?: number | null;
  status: 'active' | 'inactive';
  images?: string[];
}

export interface VariantAttr {
  name: string;
  slug: string;
  values: string[];
  displayType: 'dropdown' | 'swatch' | 'button';
}

export interface ConfigOptionData {
  optionId: string;
  label: string;
  priceModifier: number;
  image?: string;
}

export interface ConfigStepData {
  stepId: string;
  label: string;
  type: 'single_select' | 'multi_select';
  required: boolean;
  dependsOn?: { stepId: string; optionIds: string[] };
  options: ConfigOptionData[];
}

export interface ProductShippingData {
  weight: { value: number; unit: string };
  dimensions: { length: number; width: number; height: number; unit: string };
  freeShippingEligible: boolean;
}

export interface ProductDigitalData {
  deliveryMethod: string;
  downloadableFiles: Array<{ filename: string }>;
}

export interface ProductServiceData {
  serviceType: string;
  durationMinutes: number;
  cancellationPolicy: string;
  bookingLeadTimeHours: number;
}

export interface ProductPricingData {
  currency: string;
  basePrice: number;
  salePrice: number | null;
  pricingModel: 'one_time' | 'recurring' | 'tiered' | 'per_unit';
  recurringInterval: string | null;
}

export interface ProductData {
  name: string;
  slug: string;

  /** Simple price in dollars — used in card mode. */
  price: number;
  /** Simple sale price in dollars — used in card mode. */
  salePrice?: number;
  /** Primary image URL — used in card mode. */
  image?: string;
  rating?: number;
  badge?: string;
  type?: string;

  // ------ Detail-mode fields ------
  id?: string;
  sku?: string;
  description?: string | null;
  /** Structured pricing in cents — used in detail mode when present. */
  pricing?: ProductPricingData;
  images?: ProductImage[] | null;
  variants?: ProductVariantData[] | null;
  variantAttrs?: VariantAttr[] | null;
  configuration?: { steps: ConfigStepData[] } | null;
  shipping?: ProductShippingData | null;
  digital?: ProductDigitalData | null;
  service?: ProductServiceData | null;
  tags?: string[];
  relatedProducts?: string[];
}

export interface ProductCardProps {
  product?: ProductData | null;
  detailBasePath?: string;

  /** Display mode — 'card' for compact grid view, 'detail' for full interactive view. */
  mode?: 'card' | 'detail';

  // Card-mode props
  showImage?: boolean;
  imageAspectRatio?: '1:1' | '4:3' | '3:4' | '16:9';
  showPrice?: boolean;
  showRating?: boolean;
  showBadge?: boolean;
  showQuickAdd?: boolean;
  showVariantSelector?: boolean;
  showProductType?: boolean;
  cardStyle?: 'standard' | 'minimal' | 'overlay' | 'horizontal';
  hoverEffect?: 'none' | 'zoom' | 'swap-image' | 'shadow';
  onQuickAdd?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;

  // Detail-mode props
  showDescription?: boolean;
  showShippingDetails?: boolean;
  showConfiguration?: boolean;
  showVariants?: boolean;
  showTags?: boolean;
  showRelatedProducts?: boolean;
  showQuantitySelector?: boolean;
  onAddToCart?: (productId: string, quantity: number, variantId?: string) => void;

  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const aspectRatioMap: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
};

const hoverEffectMap: Record<string, string> = {
  none: '',
  zoom: 'transition-transform duration-300 group-hover:scale-110',
  'swap-image': 'transition-opacity duration-300',
  shadow: '',
};

function typeBadgeClass(type: string): string {
  switch (type) {
    case 'physical':
      return 'bg-blue-100 text-blue-800';
    case 'virtual':
      return 'bg-purple-100 text-purple-800';
    case 'service':
      return 'bg-green-100 text-green-800';
    case 'configurable':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** Format cents as currency. */
function fmtCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

/** Format dollars as currency. */
function fmtDollars(dollars: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars);
}

function renderStars(rating: number) {
  const stars: React.ReactElement[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={clsx(
          'h-3.5 w-3.5',
          i <= Math.round(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200',
        )}
      />,
    );
  }
  return stars;
}

// ---------------------------------------------------------------------------
// Sub-components for detail mode
// ---------------------------------------------------------------------------

function ImageGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Package className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-gray-100">
        <img
          src={images[currentIndex]!.url}
          alt={images[currentIndex]!.alt || name}
          className="aspect-square w-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex((p) => (p - 1 + images.length) % images.length)
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-700 shadow-md hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentIndex((p) => (p + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-700 shadow-md hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={clsx(
                'flex-shrink-0 overflow-hidden rounded-md border-2',
                i === currentIndex
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img
                src={img.url}
                alt={img.alt || `${name} thumbnail ${i + 1}`}
                className="h-14 w-14 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigStepSelector({
  step,
  value,
  currency,
  onChange,
}: {
  step: ConfigStepData;
  value?: string | string[];
  currency: string;
  onChange: (val: string | string[]) => void;
}) {
  if (step.type === 'single_select') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {step.label}
          {step.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {step.options.map((opt) => {
            const isSelected = value === opt.optionId;
            return (
              <button
                key={opt.optionId}
                type="button"
                onClick={() => onChange(opt.optionId)}
                className={clsx(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400',
                )}
              >
                {opt.label}
                {opt.priceModifier !== 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({opt.priceModifier > 0 ? '+' : ''}
                    {fmtCents(opt.priceModifier, currency)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedIds = Array.isArray(value) ? value : [];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {step.label}
        {step.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {step.options.map((opt) => {
          const isSelected = selectedIds.includes(opt.optionId);
          return (
            <button
              key={opt.optionId}
              type="button"
              onClick={() => {
                const next = isSelected
                  ? selectedIds.filter((id) => id !== opt.optionId)
                  : [...selectedIds, opt.optionId];
                onChange(next);
              }}
              className={clsx(
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400',
              )}
            >
              {opt.label}
              {opt.priceModifier !== 0 && (
                <span className="ml-1 text-xs text-gray-500">
                  ({opt.priceModifier > 0 ? '+' : ''}
                  {fmtCents(opt.priceModifier, currency)})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail View
// ---------------------------------------------------------------------------

function ProductDetailView({
  product,
  showDescription = true,
  showShippingDetails = true,
  showConfiguration = true,
  showVariants = true,
  showTags = true,
  showRelatedProducts = true,
  showQuantitySelector = true,
  detailBasePath = '/products',
  onAddToCart,
  className,
}: {
  product: ProductData;
  showDescription?: boolean;
  showShippingDetails?: boolean;
  showConfiguration?: boolean;
  showVariants?: boolean;
  showTags?: boolean;
  showRelatedProducts?: boolean;
  showQuantitySelector?: boolean;
  detailBasePath?: string;
  onAddToCart?: (productId: string, quantity: number, variantId?: string) => void;
  className?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [configSelections, setConfigSelections] = useState<
    Record<string, string | string[]>
  >({});
  const [addedMsg, setAddedMsg] = useState('');
  const [adding, setAdding] = useState(false);

  const hasPricing = !!product.pricing;
  const currency = product.pricing?.currency ?? 'USD';

  const configModifier = useMemo((): number => {
    if (!product.configuration?.steps) return 0;
    let modifier = 0;
    for (const step of product.configuration.steps) {
      const sel = configSelections[step.stepId];
      if (!sel) continue;
      const ids = Array.isArray(sel) ? sel : [sel];
      for (const id of ids) {
        const opt = step.options.find((o) => o.optionId === id);
        if (opt) modifier += opt.priceModifier;
      }
    }
    return modifier;
  }, [product.configuration, configSelections]);

  const formatDisplayPrice = useCallback(
    (cents: number): string => fmtCents(cents, currency),
    [currency],
  );

  const basePrice = product.pricing?.basePrice ?? Math.round(product.price * 100);
  const salePrice = product.pricing?.salePrice ?? (product.salePrice != null ? Math.round(product.salePrice * 100) : null);
  const displayPrice = (salePrice ?? basePrice) + configModifier;

  const images: ProductImage[] = product.images
    ? product.images.filter(Boolean)
    : product.image
      ? [{ url: product.image, alt: product.name }]
      : [];

  const handleAddToCart = async () => {
    if (!product.id && !onAddToCart) return;
    setAdding(true);
    try {
      onAddToCart?.(product.id ?? product.slug, quantity, selectedVariant);
      setAddedMsg('Added to cart!');
      setTimeout(() => setAddedMsg(''), 2000);
    } catch {
      setAddedMsg('Failed to add to cart');
      setTimeout(() => setAddedMsg(''), 3000);
    } finally {
      setAdding(false);
    }
  };

  const ctaLabel =
    product.type === 'virtual'
      ? 'Buy Now'
      : product.type === 'service'
        ? 'Book Now'
        : 'Add to Cart';

  return (
    <div className={clsx('w-full', className)}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Image gallery */}
        <ImageGallery images={images} name={product.name} />

        {/* Product info */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            {product.type && (
              <span
                className={clsx(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  typeBadgeClass(product.type),
                )}
              >
                {product.type}
              </span>
            )}
          </div>

          {product.sku && (
            <p className="mt-2 text-sm text-gray-500">SKU: {product.sku}</p>
          )}

          {/* Rating */}
          {product.rating != null && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex">{renderStars(product.rating)}</div>
              <span className="text-sm text-gray-500">({product.rating.toFixed(1)})</span>
            </div>
          )}

          {/* Price */}
          <div className="mt-4">
            {salePrice != null && salePrice < basePrice ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {formatDisplayPrice(salePrice + configModifier)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {formatDisplayPrice(basePrice + configModifier)}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                {formatDisplayPrice(displayPrice)}
              </span>
            )}
            {product.pricing?.pricingModel === 'recurring' &&
              product.pricing.recurringInterval && (
                <span className="ml-1 text-sm text-gray-500">
                  / {product.pricing.recurringInterval}
                </span>
              )}
          </div>

          {/* Description */}
          {showDescription && product.description && (
            <p className="mt-6 text-gray-700">{product.description}</p>
          )}

          {/* Physical — Shipping Details */}
          {showShippingDetails &&
            product.type === 'physical' &&
            product.shipping && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Truck className="h-4 w-4" /> Shipping Details
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <dt className="font-medium">Weight</dt>
                  <dd>
                    {product.shipping.weight.value} {product.shipping.weight.unit}
                  </dd>
                  <dt className="font-medium">Dimensions</dt>
                  <dd>
                    {product.shipping.dimensions.length} x{' '}
                    {product.shipping.dimensions.width} x{' '}
                    {product.shipping.dimensions.height}{' '}
                    {product.shipping.dimensions.unit}
                  </dd>
                  {product.shipping.freeShippingEligible && (
                    <>
                      <dt className="font-medium">Free Shipping</dt>
                      <dd className="text-green-600">Eligible</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

          {/* Virtual — Digital Delivery */}
          {showShippingDetails &&
            product.type === 'virtual' &&
            product.digital && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Download className="h-4 w-4" /> Digital Delivery
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <dt className="font-medium">Delivery</dt>
                  <dd className="capitalize">
                    {product.digital.deliveryMethod.replace(/_/g, ' ')}
                  </dd>
                  {product.digital.downloadableFiles.length > 0 && (
                    <>
                      <dt className="font-medium">Files</dt>
                      <dd>{product.digital.downloadableFiles.length} file(s)</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

          {/* Service — Service Details */}
          {showShippingDetails &&
            product.type === 'service' &&
            product.service && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Clock className="h-4 w-4" /> Service Details
                </h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <dt className="font-medium">Type</dt>
                  <dd className="capitalize">{product.service.serviceType}</dd>
                  <dt className="font-medium">Duration</dt>
                  <dd>{product.service.durationMinutes} minutes</dd>
                  <dt className="font-medium">Cancellation</dt>
                  <dd className="capitalize">{product.service.cancellationPolicy}</dd>
                  {product.service.bookingLeadTimeHours > 0 && (
                    <>
                      <dt className="font-medium">Lead Time</dt>
                      <dd>{product.service.bookingLeadTimeHours} hours</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

          {/* Configurable — Step Selectors */}
          {showConfiguration &&
            product.type === 'configurable' &&
            product.configuration?.steps &&
            product.configuration.steps.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Configure Your Product
                </h3>
                {product.configuration.steps.map((step) => (
                  <ConfigStepSelector
                    key={step.stepId}
                    step={step}
                    value={configSelections[step.stepId]}
                    currency={currency}
                    onChange={(val) =>
                      setConfigSelections((prev) => ({
                        ...prev,
                        [step.stepId]: val,
                      }))
                    }
                  />
                ))}
              </div>
            )}

          {/* Variant selector */}
          {showVariants &&
            product.variants &&
            product.variants.length > 0 &&
            product.variantAttrs && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Variant
                </h3>
                <select
                  value={selectedVariant ?? ''}
                  onChange={(e) =>
                    setSelectedVariant(e.target.value || undefined)
                  }
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a variant</option>
                  {product.variants
                    .filter((v) => v.status === 'active')
                    .map((v) => (
                      <option key={v.variantId} value={v.variantId}>
                        {Object.entries(v.attributes)
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(', ')}
                        {v.priceOverride != null &&
                          ` - ${hasPricing ? fmtCents(v.priceOverride, currency) : fmtDollars(v.priceOverride)}`}
                      </option>
                    ))}
                </select>
              </div>
            )}

          {/* Quantity + Add to Cart */}
          {(onAddToCart || showQuantitySelector) && (
            <div className="mt-8 flex items-center gap-4">
              {showQuantitySelector && (
                <div className="flex items-center rounded-md border border-gray-300">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center border-x border-gray-300 text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {onAddToCart && (
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {adding ? 'Adding...' : ctaLabel}
                </button>
              )}
            </div>
          )}

          {addedMsg && (
            <p
              className={clsx(
                'mt-3 text-sm font-medium',
                addedMsg.includes('Failed') ? 'text-red-600' : 'text-green-600',
              )}
            >
              {addedMsg}
            </p>
          )}

          {/* Tags */}
          {showTags && product.tags && product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {showRelatedProducts &&
        product.relatedProducts &&
        product.relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900">
              Related Products
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {product.relatedProducts.map((relId) => (
                <a
                  key={relId}
                  href={`${detailBasePath}/${relId}`}
                  className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500 transition-shadow hover:shadow-md"
                >
                  Related product: {relId.slice(0, 8)}...
                </a>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const ProductCard: React.FC<ProductCardProps> = ({
  product: productProp = null,
  detailBasePath = '/products',
  mode = 'card',
  showImage = true,
  imageAspectRatio = '1:1',
  showPrice = true,
  showRating = true,
  showBadge = true,
  showQuickAdd = true,
  showVariantSelector = false,
  showProductType = false,
  cardStyle = 'standard',
  hoverEffect = 'zoom',
  onQuickAdd,
  onQuickView,
  showDescription = true,
  showShippingDetails = true,
  showConfiguration = true,
  showVariants = true,
  showTags = true,
  showRelatedProducts = true,
  showQuantitySelector = true,
  onAddToCart,
  className,
}) => {
  const sampleProduct: ProductData = {
    name: 'Sample Product',
    price: 29.99,
    slug: 'sample-product',
    image: '',
    rating: 4.5,
  };

  const product = productProp ?? sampleProduct;

  // --- Detail mode ---
  if (mode === 'detail') {
    return (
      <ProductDetailView
        product={product}
        showDescription={showDescription}
        showShippingDetails={showShippingDetails}
        showConfiguration={showConfiguration}
        showVariants={showVariants}
        showTags={showTags}
        showRelatedProducts={showRelatedProducts}
        showQuantitySelector={showQuantitySelector}
        detailBasePath={detailBasePath}
        onAddToCart={onAddToCart}
        className={className}
      />
    );
  }

  // --- Card mode (existing behavior) ---
  return (
    <ProductCardView
      product={product}
      detailBasePath={detailBasePath}
      showImage={showImage}
      imageAspectRatio={imageAspectRatio}
      showPrice={showPrice}
      showRating={showRating}
      showBadge={showBadge}
      showQuickAdd={showQuickAdd}
      showVariantSelector={showVariantSelector}
      showProductType={showProductType}
      cardStyle={cardStyle}
      hoverEffect={hoverEffect}
      onQuickAdd={onQuickAdd}
      onQuickView={onQuickView}
      className={className}
    />
  );
};

// ---------------------------------------------------------------------------
// Card View (original compact view, extracted for clarity)
// ---------------------------------------------------------------------------

function ProductCardView({
  product,
  detailBasePath,
  showImage,
  imageAspectRatio,
  showPrice,
  showRating,
  showBadge,
  showQuickAdd,
  showVariantSelector,
  showProductType,
  cardStyle,
  hoverEffect,
  onQuickAdd,
  onQuickView,
  className,
}: {
  product: ProductData;
  detailBasePath: string;
  showImage: boolean;
  imageAspectRatio: string;
  showPrice: boolean;
  showRating: boolean;
  showBadge: boolean;
  showQuickAdd: boolean;
  showVariantSelector: boolean;
  showProductType: boolean;
  cardStyle: string;
  hoverEffect: string;
  onQuickAdd?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const renderPrice = () => {
    if (!showPrice) return null;

    return (
      <div className="flex items-center gap-2">
        {hasDiscount ? (
          <>
            <span className="text-lg font-bold text-red-600">
              {fmtDollars(product.salePrice!)}
            </span>
            <span className="text-sm text-gray-400 line-through">
              {fmtDollars(product.price)}
            </span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
              -{discountPercent}%
            </span>
          </>
        ) : (
          <span className="text-lg font-bold text-gray-900">{fmtDollars(product.price)}</span>
        )}
      </div>
    );
  };

  const renderImage = () => {
    if (!showImage) return null;

    return (
      <div className={clsx('relative overflow-hidden', aspectRatioMap[imageAspectRatio])}>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={clsx(
              'h-full w-full object-cover',
              hoverEffectMap[hoverEffect],
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            No Image
          </div>
        )}

        {showBadge && product.badge && (
          <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.badge}
          </span>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFavorited(!isFavorited);
          }}
          className={clsx(
            'absolute right-2 top-2 rounded-full p-1.5 transition-all',
            isFavorited
              ? 'bg-red-50 text-red-500'
              : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100',
          )}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={clsx('h-4 w-4', isFavorited && 'fill-red-500')} />
        </button>

        {(showQuickAdd || onQuickView) && (
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 flex justify-center gap-2 p-3 transition-all duration-300',
              isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
            )}
          >
            {showQuickAdd && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickAdd?.(product);
                }}
                className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg transition-colors hover:bg-gray-800"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Quick Add
              </button>
            )}
            {onQuickView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView(product);
                }}
                className="flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-lg transition-colors hover:bg-gray-100"
              >
                <Eye className="h-3.5 w-3.5" />
                Quick View
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => (
    <div className={clsx(cardStyle === 'overlay' ? 'absolute inset-x-0 bottom-0 p-4' : 'p-4')}>
      {showProductType && product.type && (
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          {product.type}
        </span>
      )}
      <h3
        className={clsx(
          'mb-1 font-medium leading-tight',
          cardStyle === 'overlay' ? 'text-white' : 'text-gray-900',
          cardStyle === 'minimal' ? 'text-sm' : 'text-base',
        )}
      >
        {product.name}
      </h3>
      {showRating && product.rating != null && (
        <div className="mb-1.5 flex items-center gap-1">
          <div className="flex">{renderStars(product.rating)}</div>
          <span className={clsx('text-xs', cardStyle === 'overlay' ? 'text-white/70' : 'text-gray-500')}>
            ({product.rating.toFixed(1)})
          </span>
        </div>
      )}
      {renderPrice()}
      {showVariantSelector && (
        <div className="mt-2 flex gap-1.5">
          {['S', 'M', 'L', 'XL'].map((size) => (
            <button
              key={size}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900"
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (cardStyle === 'horizontal') {
    return (
      <a
        href={`${detailBasePath}/${product.slug}`}
        className={clsx(
          'group flex overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md',
          hoverEffect === 'shadow' && 'hover:shadow-lg',
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showImage && (
          <div className="w-1/3 flex-shrink-0">
            <div className="relative h-full overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className={clsx('h-full w-full object-cover', hoverEffectMap[hoverEffect])}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  No Image
                </div>
              )}
              {showBadge && product.badge && (
                <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {product.badge}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center p-4">
          {showProductType && product.type && (
            <span className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              {product.type}
            </span>
          )}
          <h3 className="mb-1 text-base font-medium text-gray-900">{product.name}</h3>
          {showRating && product.rating != null && (
            <div className="mb-1.5 flex items-center gap-1">
              <div className="flex">{renderStars(product.rating)}</div>
              <span className="text-xs text-gray-500">({product.rating.toFixed(1)})</span>
            </div>
          )}
          {renderPrice()}
          {showQuickAdd && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAdd?.(product);
              }}
              className="mt-3 flex w-fit items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          )}
        </div>
      </a>
    );
  }

  return (
    <a
      href={`${detailBasePath}/${product.slug}`}
      className={clsx(
        'group relative block overflow-hidden rounded-lg transition-shadow',
        cardStyle !== 'minimal' && 'border border-gray-200 bg-white',
        hoverEffect === 'shadow' && 'hover:shadow-lg',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderImage()}
      {cardStyle === 'overlay' && showImage && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent" />
      )}
      {renderContent()}
    </a>
  );
}
