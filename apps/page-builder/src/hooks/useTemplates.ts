'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import type { ComponentTree } from '@agora-cms/shared';

export interface Template {
  id: string;
  name: string;
  description?: string;
  componentTree: ComponentTree;
  createdAt: string;
  updatedAt: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Template[]>('/api/v1/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAsTemplate = useCallback(async (pageId: string, templateName: string) => {
    const data = await apiFetch<Template>(
      `/api/v1/templates/from-page/${encodeURIComponent(pageId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ templateName }),
      },
    );
    return data;
  }, []);

  const instantiateTemplate = useCallback(async (templateId: string, slug: string, title: string) => {
    const data = await apiFetch<{ id: string; slug: string; status: string }>(
      `/api/v1/templates/${encodeURIComponent(templateId)}/instantiate`,
      {
        method: 'POST',
        body: JSON.stringify({ slug, title }),
      },
    );
    return data;
  }, []);

  return { templates, loading, error, fetchTemplates, saveAsTemplate, instantiateTemplate };
}
