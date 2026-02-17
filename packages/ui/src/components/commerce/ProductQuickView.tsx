import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, ChevronLeft, ChevronRight, Star, ShoppingCart, Minus, Plus } from 'lucide-react';

export interface QuickViewProduct {
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  description: string;
  rating?: number;
  variants?: { label: string; options: string[] }[];
  slug: string;
}

export interface ProductQuickViewProps {
  product?: QuickViewProduct | null;
  detailBasePath?: string;
  showGallery?: boolean;
  showVariants?: boolean;
  showDescription?: boolean;
  showRating?: boolean;
  showViewFullPage?: boolean;
  maxDescriptionLength?: number;
  onClose?: () => void;
  onAddToCart?: (product: QuickViewProduct, quantity: number, selectedVariants: Record<string, string>) => void;
  className?: string;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product = null,
  detailBasePath = '/products',
  showGallery = true,
  showVariants = true,
  showDescription = true,
  showRating = true,
  showViewFullPage = true,
  maxDescriptionLength = 200,
  onClose,
  onAddToCart,
  className,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  // Reset state when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setQuantity(1);
    setSelectedVariants({});
  }, [product]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [product]);

  const goToPrev = useCallback(() => {
    if (!product) return;
    setCurrentImageIndex((prev) =>
      (prev - 1 + product.images.length) % product.images.length,
    );
  }, [product]);

  const goToNext = useCallback(() => {
    if (!product) return;
    setCurrentImageIndex((prev) =>
      (prev + 1) % product.images.length,
    );
  }, [product]);

  if (!product) return null;

  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const truncatedDescription =
    product.description.length > maxDescriptionLength
      ? product.description.substring(0, maxDescriptionLength).trimEnd() + '...'
      : product.description;

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={clsx(
            'h-4 w-4',
            i <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200',
          )}
        />,
      );
    }
    return stars;
  };

  const renderGallery = () => {
    if (!showGallery || product.images.length === 0) return null;

    return (
      <div className="w-full lg:w-1/2">
        {/* Main image */}
        <div className="relative overflow-hidden rounded-lg bg-gray-100">
          <img
            src={product.images[currentImageIndex]}
            alt={`${product.name} - Image ${currentImageIndex + 1}`}
            className="aspect-square w-full object-cover"
          />

          {product.images.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-700 shadow-md transition-colors hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-700 shadow-md transition-colors hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={clsx(
                  'flex-shrink-0 overflow-hidden rounded-md border-2 transition-all',
                  i === currentImageIndex
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img
                  src={img}
                  alt={`${product.name} thumbnail ${i + 1}`}
                  className="h-14 w-14 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        className,
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${product.name}`}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white p-1.5 text-gray-500 shadow-md transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-6 p-6 lg:flex-row">
          {/* Gallery */}
          {renderGallery()}

          {/* Product details */}
          <div className="flex flex-1 flex-col">
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>

            {/* Rating */}
            {showRating && product.rating != null && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex">{renderStars(product.rating)}</div>
                <span className="text-sm text-gray-500">({product.rating.toFixed(1)})</span>
              </div>
            )}

            {/* Price */}
            <div className="mt-3 flex items-center gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPrice(product.salePrice!)}
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Save {discountPercent}%
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Description */}
            {showDescription && product.description && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {truncatedDescription}
              </p>
            )}

            {/* Variants */}
            {showVariants && product.variants && product.variants.length > 0 && (
              <div className="mt-4 space-y-3">
                {product.variants.map((variant) => (
                  <div key={variant.label}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {variant.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option) => {
                        const isSelected = selectedVariants[variant.label] === option;
                        return (
                          <button
                            key={option}
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [variant.label]: option,
                              }))
                            }
                            className={clsx(
                              'rounded-md border px-3 py-1.5 text-sm transition-all',
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-300 text-gray-700 hover:border-gray-400',
                            )}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-3">
                {/* Quantity selector */}
                <div className="flex items-center rounded-md border border-gray-300">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center border-x border-gray-300 text-sm font-medium text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={() => onAddToCart?.(product, quantity, selectedVariants)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              </div>

              {/* View full page link */}
              {showViewFullPage && (
                <a
                  href={`${detailBasePath}/${product.slug}`}
                  className="mt-3 block text-center text-sm text-blue-600 transition-colors hover:text-blue-800"
                >
                  View Full Product Page
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
