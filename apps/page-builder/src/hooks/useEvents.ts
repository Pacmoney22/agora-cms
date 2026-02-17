'use client';

import { useState, useCallback } from 'react';

const EVENTS_API = process.env.NEXT_PUBLIC_EVENTS_API_URL || 'http://localhost:3006';

export interface EventItem {
  id: string;
  title: string;
  slug?: string;
  type: string;
  format?: string;
  status: string;
  startDate: string;
  endDate?: string;
  venue?: { id: string; name: string } | null;
  ticketsSold?: number;
  totalCapacity?: number;
}

interface EventListResponse {
  data: EventItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (opts?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy: 'startDate',
        sortOrder: 'asc',
      });
      if (opts?.status) params.set('status', opts.status);

      const res = await fetch(`${EVENTS_API}/api/v1/events?${params}`);
      if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
      const data: EventListResponse = await res.json();
      setEvents(data.data);
      return data.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load events';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents };
}
