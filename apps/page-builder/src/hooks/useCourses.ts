'use client';

import { useState, useCallback } from 'react';

const COURSE_API = process.env.NEXT_PUBLIC_COURSE_API_URL || 'http://localhost:3005';

export interface CourseItem {
  id: string;
  title: string;
  slug?: string;
  status: string;
  thumbnail?: string | null;
  instructor?: string | null;
  level?: string | null;
  price?: number | null;
  duration?: string | null;
}

interface CourseListResponse {
  data: CourseItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function useCourses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (opts?: { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy: 'title',
        sortOrder: 'asc',
      });
      if (opts?.status) params.set('status', opts.status);

      const res = await fetch(`${COURSE_API}/api/v1/courses?${params}`);
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
      const data: CourseListResponse = await res.json();
      setCourses(data.data);
      return data.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load courses';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { courses, loading, error, fetchCourses };
}
