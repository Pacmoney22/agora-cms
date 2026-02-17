'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePages, type PageItem } from '@/hooks/usePages';

interface PageLinkFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * A URL field that shows a searchable dropdown of CMS pages alongside
 * a manual URL text input for external links.
 */
export const PageLinkField: React.FC<PageLinkFieldProps> = ({
  value,
  onChange,
  placeholder = 'Select a page or enter URL...',
}) => {
  const { pages, loading, error, fetchPages } = usePages();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  // Fetch pages on first open
  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchPages();
    }
  }, [isOpen, fetchPages]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [pages, search]);

  // Find the selected page to show its title
  const selectedPage = pages.find((p) => p.slug === value || `/${p.slug}` === value);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-yellow-100 text-yellow-700',
      review: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-medium uppercase ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  return (
    <div ref={dropdownRef} className="relative space-y-1">
      {/* URL text input */}
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch('');
          }}
          className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          title="Pick a page"
        >
          Pages
        </button>
      </div>

      {/* Show selected page info */}
      {selectedPage && (
        <div className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
          <span className="truncate font-medium">{selectedPage.title}</span>
          {statusBadge(selectedPage.status)}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search */}
          <div className="border-b border-gray-100 p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              autoFocus
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Page list */}
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Loading pages...
              </div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button
                  type="button"
                  onClick={() => fetchPages()}
                  className="ml-2 text-blue-500 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && filteredPages.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? `No pages match "${search}"` : 'No pages found'}
              </div>
            )}

            {!loading && !error && filteredPages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  const slug = page.slug.startsWith('/') ? page.slug : `/${page.slug}`;
                  onChange(slug);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  value === page.slug || value === `/${page.slug}`
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{page.title}</div>
                  <div className="truncate text-[10px] text-gray-400">
                    {page.slug.startsWith('/') ? page.slug : `/${page.slug}`}
                  </div>
                </div>
                {statusBadge(page.status)}
              </button>
            ))}
          </div>

          {/* Manual URL hint */}
          <div className="border-t border-gray-100 px-3 py-1.5">
            <p className="text-[10px] text-gray-400">
              Or type a URL directly for external links
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
