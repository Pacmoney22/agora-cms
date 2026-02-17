'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useProducts, type ProductItem } from '@/hooks/useProducts';

interface ProductData {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image?: string | null;
  slug: string;
  type?: string;
}

interface MultiProductFieldProps {
  value: ProductData[];
  onChange: (products: ProductData[]) => void;
}

function toProductData(p: ProductItem): ProductData {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice,
    image: p.images?.[0] ?? null,
    slug: p.slug,
    type: p.type,
  };
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

/** @deprecated This picker is no longer used — grids/cards now receive data via content routing. */
export const MultiProductField: React.FC<MultiProductFieldProps> = ({ value, onChange }) => {
  const items = Array.isArray(value) ? value : [];
  const { products, loading, error, fetchProducts } = useProducts();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectedIds = useMemo(() => new Set(items.map((p) => p.id)), [items]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [products, search]);

  const toggleProduct = useCallback(
    (product: ProductItem) => {
      if (selectedIds.has(product.id)) {
        onChange(items.filter((p) => p.id !== product.id));
      } else {
        onChange([...items, toProductData(product)]);
      }
    },
    [items, selectedIds, onChange],
  );

  return (
    <div ref={dropdownRef} className="relative space-y-2">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        {isOpen ? 'Close Picker' : `Select Products (${items.length} selected)`}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              autoFocus
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">Loading products...</div>
            )}
            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button type="button" onClick={() => fetchProducts()} className="ml-2 text-blue-500 hover:underline">
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && filteredProducts.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? `No products match "${search}"` : 'No products found'}
              </div>
            )}
            {!loading &&
              !error &&
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                    selectedIds.has(product.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      selectedIds.has(product.id)
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedIds.has(product.id) && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{product.name}</div>
                    <div className="truncate text-[10px] text-gray-400">{formatPrice(product.price)}</div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {items.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{product.name}</p>
                <p className="text-[10px] text-gray-400">{formatPrice(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((p) => p.id !== product.id))}
                className="ml-2 text-xs text-red-400 hover:text-red-600"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
