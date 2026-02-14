'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProductDto, ProductVariant, ConfigurationStep } from '@nextgen-cms/shared';
import { formatPrice } from '@nextgen-cms/shared';
import { getProduct } from '@/lib/api';
import { useCart } from '@/lib/cart-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, loading: cartLoading } = useCart();

  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [addedMsg, setAddedMsg] = useState('');

  // Configuration state for configurable products
  const [configSelections, setConfigSelections] = useState<
    Record<string, string | string[]>
  >({});

  // Fetch product
  useEffect(() => {
    setLoading(true);
    setError('');
    getProduct(productId)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  // Compute configurable price
  const configPrice = useCallback((): number => {
    if (!product?.configuration) return 0;
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
  }, [product, configSelections]);

  const displayPrice = product
    ? (product.pricing.salePrice ?? product.pricing.basePrice) + configPrice()
    : 0;

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addItem(product.id, quantity, selectedVariant);
      setAddedMsg('Added to cart!');
      setTimeout(() => setAddedMsg(''), 2000);
    } catch {
      setAddedMsg('Failed to add to cart');
      setTimeout(() => setAddedMsg(''), 3000);
    }
  };

  // ----- Loading / Error states -----
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
        <p className="mt-2 text-sm text-gray-500">{error || 'The requested product does not exist.'}</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  // ----- Render -----
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/products" className="hover:text-indigo-600">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Image area */}
        <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
          {product.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <svg
              className="h-24 w-24 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          )}
        </div>

        {/* Product info */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(
                product.type,
              )}`}
            >
              {product.type}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">SKU: {product.sku}</p>

          {/* Price */}
          <div className="mt-4">
            {product.pricing.salePrice != null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {formatPrice(product.pricing.salePrice + configPrice(), product.pricing.currency)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.pricing.basePrice + configPrice(), product.pricing.currency)}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(displayPrice, product.pricing.currency)}
              </span>
            )}
            {product.pricing.pricingModel === 'recurring' && product.pricing.recurringInterval && (
              <span className="ml-1 text-sm text-gray-500">
                / {product.pricing.recurringInterval}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-6 text-gray-700">{product.description}</p>
          )}

          {/* ----- Type-specific sections ----- */}

          {/* Physical */}
          {product.type === 'physical' && product.shipping && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Shipping Details</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <dt className="font-medium">Weight</dt>
                <dd>
                  {product.shipping.weight.value} {product.shipping.weight.unit}
                </dd>
                <dt className="font-medium">Dimensions</dt>
                <dd>
                  {product.shipping.dimensions.length} x {product.shipping.dimensions.width} x{' '}
                  {product.shipping.dimensions.height} {product.shipping.dimensions.unit}
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

          {/* Virtual */}
          {product.type === 'virtual' && product.digital && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Digital Delivery</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <dt className="font-medium">Delivery</dt>
                <dd className="capitalize">{product.digital.deliveryMethod.replace(/_/g, ' ')}</dd>
                {product.digital.downloadableFiles.length > 0 && (
                  <>
                    <dt className="font-medium">Files</dt>
                    <dd>{product.digital.downloadableFiles.length} file(s)</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Service */}
          {product.type === 'service' && product.service && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Service Details</h3>
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

          {/* Configurable - step-by-step selector */}
          {product.type === 'configurable' && product.configuration && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Configure Your Product</h3>
              {product.configuration.steps.map((step) => (
                <ConfigStep
                  key={step.stepId}
                  step={step}
                  value={configSelections[step.stepId]}
                  currency={product.pricing.currency}
                  onChange={(val) =>
                    setConfigSelections((prev) => ({ ...prev, [step.stepId]: val }))
                  }
                />
              ))}
            </div>
          )}

          {/* Variant selector (physical products with variants) */}
          {product.variants && product.variants.length > 0 && product.variantAttrs && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Variant</h3>
              <select
                value={selectedVariant ?? ''}
                onChange={(e) => setSelectedVariant(e.target.value || undefined)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                        ` - ${formatPrice(v.priceOverride, product.pricing.currency)}`}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-gray-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="flex-1 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {cartLoading
                ? 'Adding...'
                : product.type === 'virtual'
                  ? 'Buy Now'
                  : product.type === 'service'
                    ? 'Book Now'
                    : 'Add to Cart'}
            </button>
          </div>

          {addedMsg && (
            <p
              className={`mt-3 text-sm font-medium ${
                addedMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {addedMsg}
            </p>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related products placeholder */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900">Related Products</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {product.relatedProducts.length === 0 ? (
            <p className="col-span-full text-sm text-gray-500">
              No related products yet.
            </p>
          ) : (
            product.relatedProducts.map((relId) => (
              <Link
                key={relId}
                href={`/products/${relId}`}
                className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500 hover:shadow-md"
              >
                Related product: {relId.slice(0, 8)}...
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfigStep sub-component
// ---------------------------------------------------------------------------

function ConfigStep({
  step,
  value,
  currency,
  onChange,
}: {
  step: ConfigurationStep;
  value?: string | string[];
  currency: string;
  onChange: (val: string | string[]) => void;
}) {
  if (step.type === 'single_select') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {step.label}
          {step.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {step.options.map((opt) => {
            const isSelected = value === opt.optionId;
            return (
              <button
                key={opt.optionId}
                type="button"
                onClick={() => onChange(opt.optionId)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
                {opt.priceModifier !== 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({opt.priceModifier > 0 ? '+' : ''}
                    {formatPrice(opt.priceModifier, currency)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // multi_select
  const selectedIds = Array.isArray(value) ? value : [];
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {step.label}
        {step.required && <span className="text-red-500 ml-1">*</span>}
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
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {opt.label}
              {opt.priceModifier !== 0 && (
                <span className="ml-1 text-xs text-gray-500">
                  ({opt.priceModifier > 0 ? '+' : ''}
                  {formatPrice(opt.priceModifier, currency)})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
