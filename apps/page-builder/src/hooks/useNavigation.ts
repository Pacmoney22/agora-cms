'use client';

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface NavItem {
  label: string;
  url: string;
  children?: NavItem[];
}

interface NavigationMenu {
  id: string;
  location: string;
  items: NavItem[];
  updatedAt: string;
  createdAt: string;
}

export function useNavigation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNavigation = useCallback(async (location: string): Promise<NavItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<NavigationMenu>(`/api/v1/navigation/${encodeURIComponent(location)}`);
      return Array.isArray(res.items) ? res.items : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load navigation';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchNavigation };
}
