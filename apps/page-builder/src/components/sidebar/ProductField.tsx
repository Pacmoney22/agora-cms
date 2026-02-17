'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useProducts, type ProductItem } from '@/hooks/useProducts';
import { useBuilderStore } from '@/stores/builder-store';

interface ProductFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** @deprecated This picker is no longer used — grids/cards now receive data via content routing. */
export const ProductField: React.FC<ProductFieldProps> = ({
  value,
  onChange,
  placeholder = 'Select a product...',
}) => {
  const { products, loading, error, fetchProducts } = useProducts();
  const { selectedInstanceId, updateComponentProps } = useBuilderStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  /** When a product is selected, auto-populate the productData prop on the component. */
  const selectAndPopulate = useCallback(
    (product: ProductItem) => {
      onChange(product.id);
      if (selectedInstanceId) {
        updateComponentProps(selectedInstanceId, {
          productData: {
            name: product.name,
            price: product.price,
            salePrice: product.salePrice ?? null,
            image: product.images?.[0] ?? null,
            slug: product.slug,
            type: product.type ?? null,
          },
        });
      }
      setIsOpen(false);
    },
    [onChange, selectedInstanceId, updateComponentProps],
  );

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

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === value);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100);

  return (
    <div ref={dropdownRef} className="relative space-y-1">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className={selectedProduct ? 'text-gray-700' : 'text-gray-400'}>
          {selectedProduct ? selectedProduct.name : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedProduct && (
        <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs">
          <span className="truncate font-medium text-blue-700">{selectedProduct.name}</span>
          <span className="ml-2 text-blue-500">{formatPrice(selectedProduct.price)}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-1 text-blue-400 hover:text-blue-600"
            title="Clear"
          >
            &times;
          </button>
        </div>
      )}

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

            {!loading && !error && filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => selectAndPopulate(product)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  value === product.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{product.name}</div>
                  <div className="truncate text-[10px] text-gray-400">{formatPrice(product.price)}</div>
                </div>
                <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-medium uppercase ${
                  product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {product.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
