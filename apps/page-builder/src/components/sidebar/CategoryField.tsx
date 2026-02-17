'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCategories, type CategoryItem } from '@/hooks/useCategories';

interface CategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CategoryField: React.FC<CategoryFieldProps> = ({
  value,
  onChange,
  placeholder = 'Select a category...',
}) => {
  const { categories, loading, error, fetchCategories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

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

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [categories, search]);

  const selectedCategory = categories.find((c) => c.id === value);

  return (
    <div ref={dropdownRef} className="relative space-y-1">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className={selectedCategory ? 'text-gray-700' : 'text-gray-400'}>
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedCategory && (
        <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs">
          <span className="truncate font-medium text-blue-700">{selectedCategory.name}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-1 text-blue-400 hover:text-blue-600"
            title="Clear"
          >
            &times;
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              autoFocus
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">Loading categories...</div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button type="button" onClick={() => fetchCategories()} className="ml-2 text-blue-500 hover:underline">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && filteredCategories.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? `No categories match "${search}"` : 'No categories found'}
              </div>
            )}

            {!loading && !error && filteredCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  value === cat.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{cat.name}</div>
                  <div className="truncate text-[10px] text-gray-400">/{cat.slug}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
