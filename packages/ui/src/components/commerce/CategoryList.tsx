import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

export interface CategoryItem {
  name: string;
  image?: string;
  productCount?: number;
  url: string;
}

export interface CategoryListProps {
  categories?: CategoryItem[];
  layout?: 'grid' | 'list' | 'carousel' | 'masonry';
  columns?: number;
  showImage?: boolean;
  showProductCount?: boolean;
  cardStyle?: 'overlay' | 'below' | 'minimal';
  className?: string;
}

const gridColsMap: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

const masonryColsMap: Record<number, string> = {
  2: 'columns-2',
  3: 'columns-2 lg:columns-3',
  4: 'columns-2 lg:columns-3 xl:columns-4',
  5: 'columns-2 lg:columns-3 xl:columns-5',
  6: 'columns-2 lg:columns-3 xl:columns-6',
};

// Sample categories for builder preview
const sampleCategories: CategoryItem[] = [
  {
    name: 'Clothing',
    url: '/categories/clothing',
    productCount: 124,
  },
  {
    name: 'Electronics',
    url: '/categories/electronics',
    productCount: 86,
  },
  {
    name: 'Home & Garden',
    url: '/categories/home-garden',
    productCount: 203,
  },
  {
    name: 'Sports & Outdoors',
    url: '/categories/sports-outdoors',
    productCount: 67,
  },
];

export const CategoryList: React.FC<CategoryListProps> = ({
  categories = [],
  layout = 'grid',
  columns = 4,
  showImage = true,
  showProductCount = true,
  cardStyle = 'overlay',
  className,
}) => {
  const clampedCols = Math.max(2, Math.min(6, columns));
  const resolvedCategories = categories.length > 0 ? categories : sampleCategories;

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

  const renderOverlayCard = (category: CategoryItem, index: number) => (
    <a
      key={index}
      href={category.url}
      className="group relative block overflow-hidden rounded-lg"
    >
      {showImage && category.image ? (
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-gray-200">
          <span className="text-4xl font-bold text-gray-300">{category.name.charAt(0)}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-lg font-semibold text-white">{category.name}</h3>
        {showProductCount && category.productCount != null && (
          <span className="mt-0.5 block text-sm text-white/70">
            {category.productCount} product{category.productCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </a>
  );

  const renderBelowCard = (category: CategoryItem, index: number) => (
    <a
      key={index}
      href={category.url}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      {showImage && (
        <div className="overflow-hidden">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-gray-100">
              <span className="text-4xl font-bold text-gray-300">{category.name.charAt(0)}</span>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{category.name}</h3>
        {showProductCount && category.productCount != null && (
          <span className="mt-0.5 block text-sm text-gray-500">
            {category.productCount} product{category.productCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </a>
  );

  const renderMinimalCard = (category: CategoryItem, index: number) => (
    <a
      key={index}
      href={category.url}
      className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
    >
      {showImage && (
        <div className="flex-shrink-0 overflow-hidden rounded-full">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              loading="lazy"
              className="h-12 w-12 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center bg-gray-200 text-lg font-bold text-gray-400">
              {category.name.charAt(0)}
            </div>
          )}
        </div>
      )}
      <div>
        <h3 className="font-medium text-gray-900 group-hover:text-blue-600">{category.name}</h3>
        {showProductCount && category.productCount != null && (
          <span className="text-xs text-gray-500">
            {category.productCount} product{category.productCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </a>
  );

  const renderCard = (category: CategoryItem, index: number) => {
    switch (cardStyle) {
      case 'below':
        return renderBelowCard(category, index);
      case 'minimal':
        return renderMinimalCard(category, index);
      case 'overlay':
      default:
        return renderOverlayCard(category, index);
    }
  };

  if (resolvedCategories.length === 0) {
    return (
      <div className={clsx('rounded-lg border-2 border-dashed border-gray-200 py-12 text-center', className)}>
        <p className="text-gray-500">No categories to display.</p>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className={clsx('w-full', className)}>
        <div className="divide-y divide-gray-100">
          {resolvedCategories.map((cat, i) => renderCard(cat, i))}
        </div>
      </div>
    );
  }

  if (layout === 'carousel') {
    return (
      <div className={clsx('w-full', className)}>
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="-ml-4 flex">
              {resolvedCategories.map((cat, i) => (
                <div
                  key={i}
                  className={clsx(
                    'min-w-0 pl-4',
                    clampedCols <= 3
                      ? 'flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]'
                      : 'flex-[0_0_50%] sm:flex-[0_0_33.333%] lg:flex-[0_0_25%]',
                  )}
                >
                  {renderCard(cat, i)}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={scrollPrev}
            className="absolute -left-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-2 text-gray-600 shadow-md transition-colors hover:bg-gray-100"
            aria-label="Previous categories"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-2 text-gray-600 shadow-md transition-colors hover:bg-gray-100"
            aria-label="Next categories"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (layout === 'masonry') {
    return (
      <div className={clsx('w-full', className)}>
        <div className={clsx(masonryColsMap[clampedCols], 'gap-4 [&>*]:mb-4')}>
          {resolvedCategories.map((cat, i) => renderCard(cat, i))}
        </div>
      </div>
    );
  }

  // Default: grid
  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('grid gap-6', gridColsMap[clampedCols])}>
        {resolvedCategories.map((cat, i) => renderCard(cat, i))}
      </div>
    </div>
  );
};
