'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ProductDto, ProductType } from '@agora-cms/shared';
import { formatPrice } from '@agora-cms/shared';
import {
  listProducts,
  listCategories,
  type CategoryDto,
  type PaginatedResponse,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCT_TYPES: { label: string; value: ProductType }[] = [
  { label: 'Physical', value: 'physical' },
  { label: 'Virtual', value: 'virtual' },
  { label: 'Service', value: 'service' },
  { label: 'Configurable', value: 'configurable' },
];

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Type badge colour helper
// ---------------------------------------------------------------------------

function typeBadgeClass(type: ProductType): string {
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
// Page component (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function ProductListPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center text-gray-500">
          Loading products...
        </div>
      }
    >
      <ProductListContent />
    </Suspense>
  );
}

function ProductListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const search = searchParams.get('search') ?? '';
  const type = (searchParams.get('type') as ProductType) || '';
  const category = searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const page = Number(searchParams.get('page')) || 1;

  // Local form state (to allow typing before applying)
  const [searchInput, setSearchInput] = useState(search);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  // Data
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync local inputs when URL params change (e.g. back/forward)
  useEffect(() => {
    setSearchInput(search);
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
  }, [search, minPrice, maxPrice]);

  // Fetch categories once
  useEffect(() => {
    listCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  // Fetch products when filter URL params change
  useEffect(() => {
    setLoading(true);
    listProducts({
      search: search || undefined,
      type: (type as ProductType) || undefined,
      category: category || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page,
      limit: PAGE_SIZE,
      status: 'active',
    })
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [search, type, category, minPrice, maxPrice, page]);

  // Build new URL with updated params
  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page when changing filters
      if (!('page' in overrides)) params.delete('page');

      for (const [key, val] of Object.entries(overrides)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }

      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({
      search: searchInput.trim(),
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Products</h1>

      {/* Search + Price range form */}
      <form onSubmit={handleSearch} className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="w-28">
          <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700">
            Min $
          </label>
          <input
            id="minPrice"
            type="number"
            min="0"
            step="1"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="w-28">
          <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">
            Max $
          </label>
          <input
            id="maxPrice"
            type="number"
            min="0"
            step="1"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Apply
        </button>
      </form>

      {/* Filter pills: type + category */}
      <div className="mt-6 flex flex-wrap gap-6">
        {/* Product type filter */}
        <div>
          <span className="text-sm font-medium text-gray-700">Type:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              onClick={() => pushParams({ type: '' })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {PRODUCT_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => pushParams({ type: type === pt.value ? '' : pt.value })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  type === pt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                onClick={() => pushParams({ category: '' })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  !category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    pushParams({ category: category === cat.id ? '' : cat.id })
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    category === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="mt-12 text-center text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-lg font-medium text-gray-900">No products found</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                {/* Image placeholder */}
                <div className="aspect-square w-full rounded-md bg-gray-100 flex items-center justify-center">
                  {product.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt ?? product.name}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <svg
                      className="h-16 w-16 text-gray-300"
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

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                      {product.name}
                    </h3>
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(
                        product.type,
                      )}`}
                    >
                      {product.type}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatPrice(product.pricing.basePrice, product.pricing.currency)}
                    {product.pricing.salePrice != null && (
                      <span className="ml-2 text-red-600">
                        {formatPrice(product.pricing.salePrice, product.pricing.currency)}
                      </span>
                    )}
                  </p>

                  {product.shortDescription && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {product.shortDescription}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => pushParams({ page: String(page - 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => pushParams({ page: String(page + 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
