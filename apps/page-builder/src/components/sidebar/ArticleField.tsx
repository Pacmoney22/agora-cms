'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useArticles, type ArticleItem } from '@/hooks/useArticles';
import { useBuilderStore } from '@/stores/builder-store';

interface ArticleFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** @deprecated This picker is no longer used — grids/cards now receive data via content routing. */
export const ArticleField: React.FC<ArticleFieldProps> = ({
  value,
  onChange,
  placeholder = 'Select an article...',
}) => {
  const { articles, loading, error, fetchArticles } = useArticles();
  const { selectedInstanceId, updateComponentProps } = useBuilderStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  /** When an article is selected, auto-populate the post data prop on the component. */
  const selectAndPopulate = useCallback(
    (article: ArticleItem) => {
      onChange(article.id);
      if (selectedInstanceId) {
        updateComponentProps(selectedInstanceId, {
          post: {
            title: article.title,
            excerpt: article.excerpt || '',
            image: article.featuredImage,
            author: { name: article.author || 'Unknown' },
            date: article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString()
              : new Date(article.createdAt).toLocaleDateString(),
            category: article.category || '',
            slug: article.slug,
          },
        });
      }
      setIsOpen(false);
    },
    [onChange, selectedInstanceId, updateComponentProps],
  );

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchArticles();
    }
  }, [isOpen, fetchArticles]);

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

  const filteredArticles = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)),
    );
  }, [articles, search]);

  const selectedArticle = articles.find((a) => a.id === value);

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
        <span className={selectedArticle ? 'text-gray-700' : 'text-gray-400'}>
          {selectedArticle ? selectedArticle.title : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedArticle && (
        <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs">
          <span className="truncate font-medium text-blue-700">{selectedArticle.title}</span>
          {selectedArticle.category && (
            <span className="ml-2 text-blue-500">{selectedArticle.category}</span>
          )}
          <button
            type="button"
            onClick={() => {
              onChange('');
              if (selectedInstanceId) {
                updateComponentProps(selectedInstanceId, { post: null });
              }
            }}
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
              placeholder="Search articles..."
              autoFocus
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">Loading articles...</div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button type="button" onClick={() => fetchArticles()} className="ml-2 text-blue-500 hover:underline">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && filteredArticles.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? `No articles match "${search}"` : 'No articles found'}
              </div>
            )}

            {!loading && !error && filteredArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => selectAndPopulate(article)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  value === article.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{article.title}</div>
                  <div className="truncate text-[10px] text-gray-400">
                    {article.category}{article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-medium uppercase ${
                  article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {article.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
