'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface PageItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  version: number;
  isTemplate: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

interface PageListResponse {
  data: PageItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function usePages() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '100',
        sortBy: 'title',
        sortOrder: 'asc',
      });
      const res = await apiFetch<PageListResponse>(`/api/v1/pages?${params}`);
      setPages(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  return { pages, meta, loading, error, fetchPages };
}
