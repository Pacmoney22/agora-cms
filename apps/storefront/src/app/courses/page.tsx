'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { CourseDto } from '@/lib/api';
import { listCourses, type PaginatedResponse } from '@/lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_LEVELS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Difficulty badge color helper
// ---------------------------------------------------------------------------

function difficultyBadgeClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Page component (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function CourseListPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center text-gray-500">
          Loading courses...
        </div>
      }
    >
      <CourseListContent />
    </Suspense>
  );
}

function CourseListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const search = searchParams.get('search') ?? '';
  const difficulty = searchParams.get('difficulty') ?? '';
  const page = Number(searchParams.get('page')) || 1;

  // Local form state (to allow typing before applying)
  const [searchInput, setSearchInput] = useState(search);

  // Data
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sync local inputs when URL params change (e.g. back/forward)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Fetch courses when filter URL params change
  useEffect(() => {
    setLoading(true);
    listCourses({
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        // Filter by difficulty on the client side if needed
        let filteredData = res.data;
        if (difficulty) {
          filteredData = res.data.filter(
            (course) =>
              course.courseMetadata?.difficulty?.toLowerCase() === difficulty.toLowerCase()
          );
        }
        setCourses(filteredData);
        setTotal(difficulty ? filteredData.length : res.total);
      })
      .catch(() => {
        setCourses([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [search, difficulty, page]);

  // Build new URL with updated params
  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page when changing filters
      if (!('page' in overrides)) params.delete('page');

      for (const [key, val] of Object.entries(overrides)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }

      router.push(`/courses?${params.toString()}`);
    },
    [router, searchParams],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({
      search: searchInput.trim(),
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search Courses
          </label>
          <input
            id="search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or instructor..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {/* Filter pills: difficulty */}
      <div className="mt-6 flex flex-wrap gap-6">
        <div>
          <span className="text-sm font-medium text-gray-700">Difficulty:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              onClick={() => pushParams({ difficulty: '' })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !difficulty
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() =>
                  pushParams({ difficulty: difficulty === level.value ? '' : level.value })
                }
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  difficulty === level.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="mt-12 text-center text-gray-500">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-lg font-medium text-gray-900">No courses found</p>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => {
              const metadata = course.courseMetadata || {};
              const difficulty = metadata.difficulty || 'beginner';
              const estimatedHours = metadata.estimatedHours || 0;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video w-full rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                    {course.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        className="h-16 w-16 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                      {course.title}
                    </h3>

                    {course.instructorName && (
                      <p className="mt-1 text-xs text-gray-500">
                        by {course.instructorName}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${difficultyBadgeClass(
                          difficulty,
                        )}`}
                      >
                        {difficulty}
                      </span>
                      {estimatedHours > 0 && (
                        <span className="text-xs text-gray-500">
                          {estimatedHours} hours
                        </span>
                      )}
                    </div>

                    {course.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                        {course.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => pushParams({ page: String(page - 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => pushParams({ page: String(page + 1) })}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
