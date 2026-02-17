import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { BlogPostCard } from './BlogPostCard';
import type { BlogPost } from './BlogPostCard';

export interface BlogGridProps {
  posts?: BlogPost[];
  source?: 'recent' | 'category' | 'tag' | 'featured';
  maxPosts?: number;
  columns?: 1 | 2 | 3 | 4;
  layout?: 'grid' | 'list' | 'masonry';
  showFilters?: boolean;
  paginationStyle?: 'load-more' | 'numbered' | 'infinite-scroll';
  featuredFirst?: boolean;
  detailBasePath?: string;
  className?: string;
}

const gridColsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

// Sample posts for builder preview
const samplePosts: BlogPost[] = [
  {
    title: 'Getting Started with Our Platform',
    excerpt: 'Learn the basics of setting up your account and making the most of our features.',
    category: 'Tutorials',
    date: 'Jan 15, 2025',
    readTime: '5 min read',
    author: { name: 'Jane Smith' },
    slug: 'getting-started',
  },
  {
    title: 'Top 10 Tips for Better Productivity',
    excerpt: 'Discover proven strategies to streamline your workflow and accomplish more every day.',
    category: 'Productivity',
    date: 'Jan 10, 2025',
    readTime: '8 min read',
    author: { name: 'John Doe' },
    slug: 'productivity-tips',
  },
  {
    title: 'What\'s New in Our Latest Release',
    excerpt: 'Explore the exciting new features and improvements we shipped this month.',
    category: 'Updates',
    date: 'Jan 5, 2025',
    readTime: '4 min read',
    author: { name: 'Sarah Johnson' },
    slug: 'latest-release',
  },
  {
    title: 'Building a Great Team Culture',
    excerpt: 'How to foster collaboration and create an environment where everyone thrives.',
    category: 'Culture',
    date: 'Dec 28, 2024',
    readTime: '6 min read',
    author: { name: 'Mike Chen' },
    slug: 'team-culture',
  },
];

export const BlogGrid: React.FC<BlogGridProps> = ({
  posts = [],
  source = 'recent',
  maxPosts = 6,
  columns = 3,
  layout = 'grid',
  showFilters = false,
  paginationStyle = 'load-more',
  featuredFirst = false,
  detailBasePath = '/blog',
  className,
}) => {
  const allPosts = posts.length > 0 ? posts : samplePosts;

  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const categories = Array.from(
    new Set(allPosts.map((p) => p.category).filter(Boolean)),
  );

  const filteredPosts =
    activeFilter === 'all'
      ? allPosts
      : allPosts.filter((p) => p.category === activeFilter);

  const totalPages = Math.ceil(filteredPosts.length / maxPosts);
  const paginatedPosts = filteredPosts.slice(0, currentPage * maxPosts);

  const displayPosts =
    paginationStyle === 'numbered'
      ? filteredPosts.slice((currentPage - 1) * maxPosts, currentPage * maxPosts)
      : paginatedPosts;

  if (layout === 'list') {
    return (
      <div className={clsx('w-full', className)}>
        {showFilters && categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat!)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  activeFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {displayPosts.map((post, i) => (
            <BlogPostCard key={i} post={post} cardStyle="horizontal" detailBasePath={detailBasePath} />
          ))}
        </div>

        {renderPagination()}
      </div>
    );
  }

  function renderPagination() {
    if (paginationStyle === 'load-more' && currentPage * maxPosts < filteredPosts.length) {
      return (
        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Loader2 className="h-4 w-4" />
            Load More
          </button>
        </div>
      );
    }

    if (paginationStyle === 'numbered' && totalPages > 1) {
      return (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </nav>
      );
    }

    return null;
  }

  return (
    <div className={clsx('w-full', className)}>
      {showFilters && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat!)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div
        className={clsx(
          'grid gap-6',
          layout === 'masonry' ? `columns-${columns} gap-6` : gridColsMap[columns],
        )}
      >
        {displayPosts.map((post, i) => {
          const isFeatured = featuredFirst && i === 0;
          return (
            <div
              key={i}
              className={clsx(
                isFeatured && columns >= 2 && 'md:col-span-2',
                layout === 'masonry' && 'break-inside-avoid',
              )}
            >
              <BlogPostCard
                post={post}
                cardStyle={isFeatured ? 'overlay' : 'standard'}
                detailBasePath={detailBasePath}
              />
            </div>
          );
        })}
      </div>

      {renderPagination()}
    </div>
  );
};
