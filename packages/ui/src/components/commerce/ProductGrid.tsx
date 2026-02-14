import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProductCard, ProductData } from './ProductCard';

export interface ProductGridProps {
  source?: 'category' | 'tag' | 'manual' | 'best-sellers' | 'new-arrivals' | 'on-sale' | 'related';
  categoryId?: string | null;
  productTypes?: string[];
  products?: ProductData[];
  maxProducts?: number;
  columns?: 2 | 3 | 4 | 5;
  showFilters?: boolean;
  showSort?: boolean;
  paginationStyle?: 'load-more' | 'numbered' | 'infinite-scroll';
  emptyStateMessage?: string;
  onQuickAdd?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  className?: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest';

const gridColsMap: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

const ITEMS_PER_PAGE = 12;

export const ProductGrid: React.FC<ProductGridProps> = ({
  source = 'manual',
  categoryId = null,
  productTypes = [],
  products = [],
  maxProducts = 24,
  columns = 4,
  showFilters = true,
  showSort = true,
  paginationStyle = 'load-more',
  emptyStateMessage = 'No products found matching your criteria.',
  onQuickAdd,
  onQuickView,
  className,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPriceRange, setFilterPriceRange] = useState<[number, number] | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Derive available types from products
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    products.forEach((p) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types);
  }, [products]);

  // Derive price range from products
  const priceExtent = useMemo(() => {
    if (products.length === 0) return [0, 100] as [number, number];
    const prices = products.map((p) => p.salePrice ?? p.price);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))] as [number, number];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filterType) {
      result = result.filter((p) => p.type === filterType);
    }

    if (filterPriceRange) {
      result = result.filter((p) => {
        const price = p.salePrice ?? p.price;
        return price >= filterPriceRange[0] && price <= filterPriceRange[1];
      });
    }

    return result.slice(0, maxProducts);
  }, [products, filterType, filterPriceRange, maxProducts]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const result = [...filteredProducts];

    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        result.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case 'newest':
      default:
        break;
    }

    return result;
  }, [filteredProducts, sortBy]);

  // Paginate
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);

  const displayedProducts = useMemo(() => {
    if (paginationStyle === 'load-more' || paginationStyle === 'infinite-scroll') {
      return sortedProducts.slice(0, currentPage * ITEMS_PER_PAGE);
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage, paginationStyle]);

  const hasMore = paginationStyle === 'load-more' || paginationStyle === 'infinite-scroll'
    ? displayedProducts.length < sortedProducts.length
    : currentPage < totalPages;

  const clearFilters = () => {
    setFilterCategory(null);
    setFilterPriceRange(null);
    setFilterType(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = filterCategory || filterPriceRange || filterType;

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <>
        {/* Mobile filter toggle */}
        <button
          className="mb-4 flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 lg:hidden"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          Filters
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              !
            </span>
          )}
        </button>

        <aside
          className={clsx(
            'flex-shrink-0 space-y-6',
            filtersOpen ? 'block' : 'hidden lg:block',
            'w-full lg:w-56',
          )}
        >
          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Active Filters</span>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Type filter */}
          {availableTypes.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Product Type</h4>
              <div className="space-y-1.5">
                {availableTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="radio"
                      name="filter-type"
                      checked={filterType === type}
                      onChange={() => {
                        setFilterType(filterType === type ? null : type);
                        setCurrentPage(1);
                      }}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {type}
                  </label>
                ))}
                {filterType && (
                  <button
                    onClick={() => {
                      setFilterType(null);
                      setCurrentPage(1);
                    }}
                    className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Price range filter */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Price Range</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`$${priceExtent[0]}`}
                min={priceExtent[0]}
                max={priceExtent[1]}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                onChange={(e) => {
                  const min = Number(e.target.value) || priceExtent[0];
                  setFilterPriceRange([min, filterPriceRange?.[1] ?? priceExtent[1]]);
                  setCurrentPage(1);
                }}
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder={`$${priceExtent[1]}`}
                min={priceExtent[0]}
                max={priceExtent[1]}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                onChange={(e) => {
                  const max = Number(e.target.value) || priceExtent[1];
                  setFilterPriceRange([filterPriceRange?.[0] ?? priceExtent[0], max]);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </aside>
      </>
    );
  };

  const renderSort = () => {
    if (!showSort) return null;

    return (
      <div className="flex items-center gap-2">
        <label htmlFor="product-sort" className="text-sm text-gray-600">
          Sort by:
        </label>
        <select
          id="product-sort"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortOption);
            setCurrentPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="newest">Newest</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
        </select>
      </div>
    );
  };

  const renderPagination = () => {
    if (sortedProducts.length <= ITEMS_PER_PAGE) return null;

    if (paginationStyle === 'load-more') {
      if (!hasMore) return null;
      return (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Load More Products
          </button>
        </div>
      );
    }

    if (paginationStyle === 'numbered') {
      return (
        <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Product pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={clsx(
                'min-w-[2rem] rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      );
    }

    // infinite-scroll: same as load-more visually, could be enhanced with IntersectionObserver
    if (hasMore) {
      return (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Load More Products
          </button>
        </div>
      );
    }

    return null;
  };

  if (sortedProducts.length === 0) {
    return (
      <div className={clsx('py-16 text-center', className)}>
        <p className="text-gray-500">{emptyStateMessage}</p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-gray-500">
          {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
        </span>
        {renderSort()}
      </div>

      <div className="flex gap-8">
        {/* Filters sidebar */}
        {renderFilters()}

        {/* Product grid */}
        <div className="flex-1">
          <div className={clsx('grid gap-6', gridColsMap[columns])}>
            {displayedProducts.map((product, index) => (
              <ProductCard
                key={`${product.slug}-${index}`}
                product={product}
                showQuickAdd
                onQuickAdd={onQuickAdd}
                onQuickView={onQuickView}
              />
            ))}
          </div>

          {renderPagination()}
        </div>
      </div>
    </div>
  );
};
