import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface NavPost {
  title: string;
  slug: string;
  image?: string;
}

export interface PostNavigationProps {
  previousPost?: NavPost | null;
  nextPost?: NavPost | null;
  showThumbnails?: boolean;
  showLabels?: boolean;
  scope?: 'all' | 'same-category';
  style?: 'simple' | 'card' | 'full-width';
  className?: string;
}

export const PostNavigation: React.FC<PostNavigationProps> = ({
  previousPost = null,
  nextPost = null,
  showThumbnails = false,
  showLabels = true,
  scope = 'all',
  style = 'simple',
  className,
}) => {
  if (!previousPost && !nextPost) return null;

  if (style === 'full-width') {
    return (
      <nav
        className={clsx('grid grid-cols-1 md:grid-cols-2', className)}
        aria-label="Post navigation"
      >
        {previousPost ? (
          <a
            href={`/blog/${previousPost.slug}`}
            rel="prev"
            className="group relative flex items-center overflow-hidden bg-gray-900 p-8 text-white transition-all hover:bg-gray-800"
          >
            {showThumbnails && previousPost.image && (
              <img
                src={previousPost.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity group-hover:opacity-30"
              />
            )}
            <div className="relative z-10">
              <ChevronLeft className="mb-2 h-5 w-5 text-gray-400" />
              {showLabels && (
                <span className="text-xs uppercase tracking-wider text-gray-400">
                  Previous Post
                </span>
              )}
              <p className="mt-1 text-lg font-semibold">{previousPost.title}</p>
            </div>
          </a>
        ) : (
          <div />
        )}
        {nextPost ? (
          <a
            href={`/blog/${nextPost.slug}`}
            rel="next"
            className="group relative flex items-center justify-end overflow-hidden bg-gray-900 p-8 text-right text-white transition-all hover:bg-gray-800"
          >
            {showThumbnails && nextPost.image && (
              <img
                src={nextPost.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity group-hover:opacity-30"
              />
            )}
            <div className="relative z-10">
              <ChevronRight className="mb-2 ml-auto h-5 w-5 text-gray-400" />
              {showLabels && (
                <span className="text-xs uppercase tracking-wider text-gray-400">
                  Next Post
                </span>
              )}
              <p className="mt-1 text-lg font-semibold">{nextPost.title}</p>
            </div>
          </a>
        ) : (
          <div />
        )}
      </nav>
    );
  }

  if (style === 'card') {
    return (
      <nav
        className={clsx(
          'grid grid-cols-1 gap-4 md:grid-cols-2',
          className,
        )}
        aria-label="Post navigation"
      >
        {previousPost ? (
          <a
            href={`/blog/${previousPost.slug}`}
            rel="prev"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            {showThumbnails && previousPost.image && (
              <img
                src={previousPost.image}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            )}
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ChevronLeft className="h-4 w-4" />
                {showLabels && <span>Previous</span>}
              </div>
              <p className="mt-1 font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                {previousPost.title}
              </p>
            </div>
          </a>
        ) : (
          <div />
        )}
        {nextPost ? (
          <a
            href={`/blog/${nextPost.slug}`}
            rel="next"
            className="group flex items-center justify-end gap-4 rounded-xl border border-gray-200 bg-white p-4 text-right transition-shadow hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-end gap-1 text-sm text-gray-500">
                {showLabels && <span>Next</span>}
                <ChevronRight className="h-4 w-4" />
              </div>
              <p className="mt-1 font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                {nextPost.title}
              </p>
            </div>
            {showThumbnails && nextPost.image && (
              <img
                src={nextPost.image}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            )}
          </a>
        ) : (
          <div />
        )}
      </nav>
    );
  }

  // Simple style
  return (
    <nav
      className={clsx(
        'flex items-center justify-between border-t border-gray-200 py-4',
        className,
      )}
      aria-label="Post navigation"
    >
      {previousPost ? (
        <a
          href={`/blog/${previousPost.slug}`}
          rel="prev"
          className="group flex items-center gap-2 text-gray-600 transition-colors hover:text-blue-600"
        >
          <ChevronLeft className="h-5 w-5" />
          <div>
            {showLabels && (
              <span className="block text-xs uppercase tracking-wider text-gray-400">
                Previous
              </span>
            )}
            <span className="font-medium">{previousPost.title}</span>
          </div>
        </a>
      ) : (
        <div />
      )}
      {nextPost ? (
        <a
          href={`/blog/${nextPost.slug}`}
          rel="next"
          className="group flex items-center gap-2 text-right text-gray-600 transition-colors hover:text-blue-600"
        >
          <div>
            {showLabels && (
              <span className="block text-xs uppercase tracking-wider text-gray-400">
                Next
              </span>
            )}
            <span className="font-medium">{nextPost.title}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </a>
      ) : (
        <div />
      )}
    </nav>
  );
};
