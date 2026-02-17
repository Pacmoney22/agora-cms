'use client';

import React, { useCallback } from 'react';
import { useArticles } from '@/hooks/useArticles';
import type { ArticleItem } from '@/hooks/useArticles';

interface BlogPost {
  title: string;
  excerpt?: string;
  image?: string | null;
  author?: { name: string; avatar?: string | null };
  date?: string;
  category?: string;
  readTime?: string;
  slug: string;
}

interface BlogPostsFieldProps {
  value: BlogPost[];
  onChange: (posts: BlogPost[]) => void;
}

function articleToBlogPost(article: ArticleItem): BlogPost {
  return {
    title: article.title,
    excerpt: article.excerpt || '',
    image: article.featuredImage,
    author: { name: article.author || 'Unknown' },
    date: article.publishedAt
      ? new Date(article.publishedAt).toLocaleDateString()
      : new Date(article.createdAt).toLocaleDateString(),
    category: article.category || '',
    slug: article.slug,
  };
}

/** @deprecated This picker is no longer used — grids/cards now receive data via content routing. */
export const BlogPostsField: React.FC<BlogPostsFieldProps> = ({ value, onChange }) => {
  const posts = Array.isArray(value) ? value : [];
  const { loading, error, fetchArticles } = useArticles();

  const handleLoadArticles = useCallback(async () => {
    const articles = await fetchArticles({ limit: 50 });
    if (articles.length > 0) {
      onChange(articles.map(articleToBlogPost));
    }
  }, [fetchArticles, onChange]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLoadArticles}
        disabled={loading}
        className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load from Articles'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {posts.length > 0 ? (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {posts.map((post, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{post.title}</p>
                <p className="text-[10px] text-gray-400">{post.category} {post.date ? `· ${post.date}` : ''}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(posts.filter((_, j) => j !== i))}
                className="ml-2 text-xs text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">No posts loaded. Click above to load from articles.</p>
      )}
    </div>
  );
};
