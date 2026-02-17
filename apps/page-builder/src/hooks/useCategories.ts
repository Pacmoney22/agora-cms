'use client';

import { useState, useCallback } from 'react';

const COMMERCE_API = process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  productCount?: number;
}

interface CategoryListResponse {
  data: CategoryItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '200',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      const res = await fetch(`${COMMERCE_API}/api/v1/categories?${params}`);
      if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
      const data: CategoryListResponse = await res.json();
      setCategories(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  return { categories, loading, error, fetchCategories };
}
