import React from 'react';
import { clsx } from 'clsx';
import { BlogPostCard } from './BlogPostCard';
import type { BlogPost } from './BlogPostCard';

export interface RelatedPostsProps {
  posts?: BlogPost[];
  source?: 'auto' | 'manual';
  maxPosts?: number;
  heading?: string;
  showImage?: boolean;
  className?: string;
}

export const RelatedPosts: React.FC<RelatedPostsProps> = ({
  posts = [],
  source = 'auto',
  maxPosts = 3,
  heading = 'Related Posts',
  showImage = true,
  className,
}) => {
  const displayPosts = posts.slice(0, Math.min(Math.max(2, maxPosts), 6));

  if (displayPosts.length === 0) {
    return null;
  }

  const colsMap: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <section className={clsx('w-full', className)} aria-label={heading}>
      {heading && (
        <h2 className="mb-6 text-2xl font-bold text-gray-900">{heading}</h2>
      )}
      <div
        className={clsx(
          'grid gap-6',
          colsMap[displayPosts.length] || 'grid-cols-1 md:grid-cols-3',
        )}
      >
        {displayPosts.map((post, i) => (
          <BlogPostCard
            key={i}
            post={post}
            showImage={showImage}
            showExcerpt={false}
            showAuthor={false}
            showReadTime={false}
            cardStyle="standard"
          />
        ))}
      </div>
    </section>
  );
};
