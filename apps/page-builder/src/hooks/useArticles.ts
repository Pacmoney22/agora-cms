'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string | null;
  category: string;
  tags: string[];
  author: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

interface ArticleListResponse {
  data: ArticleItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useArticles() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async (params?: { category?: string; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams({
        limit: String(params?.limit || 50),
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
      if (params?.category) {
        searchParams.set('category', params.category);
      }
      const res = await apiFetch<ArticleListResponse>(`/api/v1/articles?${searchParams}`);
      setArticles(res.data);
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load articles';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { articles, loading, error, fetchArticles };
}
