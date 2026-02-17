'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  altText?: string;
  dimensions?: { width: number; height: number };
  variants?: Record<string, string>;
  url: string;
  thumbnailUrl: string;
  createdAt: string;
}

interface MediaListResponse {
  data: MediaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useMediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async (page = 1, mimeType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (mimeType) params.set('mimeType', mimeType);
      const res = await apiFetch<MediaListResponse>(`/api/v1/media?${params}`);
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<MediaItem | null> => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<MediaItem>('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteMedia = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/v1/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, []);

  return { items, meta, loading, uploading, error, fetchMedia, uploadFile, deleteMedia };
}
