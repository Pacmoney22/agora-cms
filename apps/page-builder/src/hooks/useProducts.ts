'use client';

import { useState, useCallback } from 'react';

const COMMERCE_API = process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  status: string;
  images?: string[];
  type?: string;
}

interface ProductListResponse {
  data: ProductItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useProducts() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy: 'name',
        sortOrder: 'asc',
      });
      if (search) params.set('search', search);

      const res = await fetch(`${COMMERCE_API}/api/v1/products?${params}`);
      if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
      const data: ProductListResponse = await res.json();
      setProducts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, fetchProducts };
}
