import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react';

export interface ProductData {
  name: string;
  price: number;
  salePrice?: number;
  image?: string;
  rating?: number;
  badge?: string;
  slug: string;
  type?: string;
}

export interface ProductCardProps {
  product?: ProductData | null;
  detailBasePath?: string;
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
  className?: string;
}

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

export const ProductCard: React.FC<ProductCardProps> = ({
  product: productProp = null,
  detailBasePath = '/products',
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
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const sampleProduct: ProductData = {
    name: 'Sample Product',
    price: 29.99,
    slug: 'sample-product',
    image: '',
    rating: 4.5,
  };

  const product = productProp ?? sampleProduct;

  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const renderStars = (rating: number) => {
    const stars = [];
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
  };

  const renderPrice = () => {
    if (!showPrice) return null;

    return (
      <div className="flex items-center gap-2">
        {hasDiscount ? (
          <>
            <span className="text-lg font-bold text-red-600">
              {formatPrice(product.salePrice!)}
            </span>
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
              -{discountPercent}%
            </span>
          </>
        ) : (
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
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

        {/* Badge */}
        {showBadge && product.badge && (
          <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.badge}
          </span>
        )}

        {/* Wishlist button */}
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

        {/* Quick action overlay */}
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
};
