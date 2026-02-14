import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { ProductCard, ProductData } from './ProductCard';

export interface FeaturedProductsProps {
  heading?: string;
  source?: 'manual' | 'best-sellers' | 'new-arrivals' | 'on-sale' | 'recently-viewed' | 'recommended';
  products?: ProductData[];
  maxProducts?: number;
  layout?: 'row' | 'carousel';
  viewAllLink?: string | null;
  onQuickAdd?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  className?: string;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  heading = 'Featured Products',
  source = 'manual',
  products = [],
  maxProducts = 4,
  layout = 'row',
  viewAllLink = null,
  onQuickAdd,
  onQuickView,
  className,
}) => {
  const clampedMax = Math.max(2, Math.min(8, maxProducts));
  const displayProducts = products.slice(0, clampedMax);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const renderHeader = () => (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
      <div className="flex items-center gap-3">
        {viewAllLink && (
          <a
            href={viewAllLink}
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            View All
          </a>
        )}
        {layout === 'carousel' && (
          <div className="flex gap-1">
            <button
              onClick={scrollPrev}
              className="rounded-full border border-gray-300 p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Previous products"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={scrollNext}
              className="rounded-full border border-gray-300 p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Next products"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderRow = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {displayProducts.map((product, index) => (
        <ProductCard
          key={`${product.slug}-${index}`}
          product={product}
          showQuickAdd
          onQuickAdd={onQuickAdd}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="-ml-4 flex">
        {displayProducts.map((product, index) => (
          <div
            key={`${product.slug}-${index}`}
            className="min-w-0 flex-[0_0_100%] pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%]"
          >
            <ProductCard
              product={product}
              showQuickAdd
              onQuickAdd={onQuickAdd}
              onQuickView={onQuickView}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (displayProducts.length === 0) {
    return (
      <div className={clsx('w-full', className)}>
        {renderHeader()}
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-gray-500">No products to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      {renderHeader()}
      {layout === 'carousel' ? renderCarousel() : renderRow()}
    </div>
  );
};
