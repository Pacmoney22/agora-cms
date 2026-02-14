import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  placeholder?: string;
  searchScope?: 'all' | 'products' | 'content' | 'blog';
  showInstantResults?: boolean;
  maxSuggestions?: number;
  showCategories?: boolean;
  showThumbnails?: boolean;
  style?: 'standard' | 'expandable' | 'fullscreen';
  hotkey?: string;
  className?: string;
}

interface SearchResult {
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  url: string;
}

const mockResults: SearchResult[] = [
  { title: 'Getting Started Guide', description: 'Learn how to set up your account', category: 'Content', thumbnail: '/placeholder-thumb.jpg', url: '#' },
  { title: 'Product Overview', description: 'Explore our full product lineup', category: 'Products', thumbnail: '/placeholder-thumb.jpg', url: '#' },
  { title: 'Blog: Best Practices', description: 'Tips and tricks for better results', category: 'Blog', thumbnail: '/placeholder-thumb.jpg', url: '#' },
  { title: 'API Documentation', description: 'Reference docs for developers', category: 'Content', url: '#' },
  { title: 'Pricing Plans', description: 'Compare plans and features', category: 'Products', url: '#' },
  { title: 'Blog: Year in Review', description: 'A look back at our progress', category: 'Blog', url: '#' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  searchScope = 'all',
  showInstantResults = true,
  maxSuggestions = 5,
  showCategories = true,
  showThumbnails = false,
  style = 'standard',
  hotkey = '/',
  className,
}) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredResults = query.trim().length > 0
    ? mockResults
        .filter((r) => {
          const matchesQuery = r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.description.toLowerCase().includes(query.toLowerCase());
          if (searchScope === 'all') return matchesQuery;
          return matchesQuery && r.category.toLowerCase() === searchScope;
        })
        .slice(0, maxSuggestions)
    : [];

  const showDropdown = showInstantResults && focused && filteredResults.length > 0;

  // Hotkey listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === hotkey && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        if (style === 'fullscreen') {
          setFullscreenOpen(true);
        } else if (style === 'expandable') {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          inputRef.current?.focus();
        }
      }
      if (e.key === 'Escape') {
        if (style === 'fullscreen') setFullscreenOpen(false);
        if (style === 'expandable') setExpanded(false);
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hotkey, style]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        if (style === 'expandable' && !query) setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [style, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFocused(false);
  };

  const categorizedResults = showCategories
    ? filteredResults.reduce<Record<string, SearchResult[]>>((acc, result) => {
        if (!acc[result.category]) acc[result.category] = [];
        acc[result.category]!.push(result);
        return acc;
      }, {})
    : { '': filteredResults };

  const resultsDropdown = (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      {Object.entries(categorizedResults).map(([category, results]) => (
        <div key={category || 'all'}>
          {showCategories && category && (
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{category}</span>
            </div>
          )}
          {results.map((result, i) => (
            <a
              key={i}
              href={result.url}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
              onMouseDown={(e) => e.preventDefault()}
            >
              {showThumbnails && result.thumbnail && (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                  <img src={result.thumbnail} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                <p className="truncate text-xs text-gray-500">{result.description}</p>
              </div>
            </a>
          ))}
        </div>
      ))}
    </div>
  );

  // Standard style
  if (style === 'standard') {
    return (
      <div ref={containerRef} className={clsx('relative w-full', className)}>
        <form role="search" onSubmit={handleSubmit}>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
        {showDropdown && resultsDropdown}
      </div>
    );
  }

  // Expandable style
  if (style === 'expandable') {
    return (
      <div ref={containerRef} className={clsx('relative', className)}>
        {!expanded ? (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Open search"
          >
            <Search size={20} />
          </button>
        ) : (
          <div className="relative">
            <form role="search" onSubmit={handleSubmit}>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder={placeholder}
                  className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Search"
                />
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setExpanded(false);
                    setFocused(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>
            </form>
            {showDropdown && resultsDropdown}
          </div>
        )}
      </div>
    );
  }

  // Fullscreen style
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setFullscreenOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Open search"
      >
        <Search size={20} />
      </button>

      {fullscreenOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-end p-4">
            <button
              type="button"
              onClick={() => {
                setFullscreenOpen(false);
                setQuery('');
                setFocused(false);
              }}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close search"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mx-auto w-full max-w-2xl px-4 pt-8">
            <form role="search" onSubmit={handleSubmit}>
              <div className="relative">
                <Search size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder={placeholder}
                  autoFocus
                  className="w-full border-b-2 border-gray-300 bg-transparent py-4 pl-14 pr-4 text-2xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                  aria-label="Search"
                />
              </div>
            </form>

            {showInstantResults && filteredResults.length > 0 && (
              <div className="mt-6">
                {Object.entries(categorizedResults).map(([category, results]) => (
                  <div key={category || 'all'} className="mb-4">
                    {showCategories && category && (
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{category}</p>
                    )}
                    {results.map((result, i) => (
                      <a
                        key={i}
                        href={result.url}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-gray-100"
                      >
                        {showThumbnails && result.thumbnail && (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                            <img src={result.thumbnail} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-gray-900">{result.title}</p>
                          <p className="text-sm text-gray-500">{result.description}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {query.trim() && filteredResults.length === 0 && (
              <p className="mt-8 text-center text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
