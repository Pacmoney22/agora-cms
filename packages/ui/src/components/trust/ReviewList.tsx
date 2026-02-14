import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Star, BadgeCheck, ThumbsUp, ImageIcon } from 'lucide-react';

export interface Review {
  author: string;
  rating: number;
  title?: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  media?: string[];
}

export interface ReviewListProps {
  reviews?: Review[];
  maxReviews?: number;
  sortDefault?: 'newest' | 'highest' | 'lowest' | 'most-helpful';
  showVerifiedBadge?: boolean;
  showHelpful?: boolean;
  showMedia?: boolean;
  className?: string;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={clsx(
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-200',
          )}
        />
      ))}
    </div>
  );
}

function sortReviews(reviews: Review[], sortBy: string): Review[] {
  const sorted = [...reviews];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    case 'highest':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'lowest':
      return sorted.sort((a, b) => a.rating - b.rating);
    case 'most-helpful':
      return sorted.sort((a, b) => b.helpful - a.helpful);
    default:
      return sorted;
  }
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews = [],
  maxReviews = 10,
  sortDefault = 'newest',
  showVerifiedBadge = true,
  showHelpful = true,
  showMedia = true,
  className,
}) => {
  const [sortBy, setSortBy] = useState(sortDefault);
  const [helpfulIds, setHelpfulIds] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(maxReviews);

  const sorted = sortReviews(reviews, sortBy);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const markHelpful = (index: number) => {
    setHelpfulIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "highest" | "lowest" | "most-helpful")}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Sort reviews"
        >
          <option value="newest">Newest</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
          <option value="most-helpful">Most Helpful</option>
        </select>
      </div>

      <div className="divide-y divide-gray-100">
        {visible.map((review, index) => (
          <div key={index} className="py-5">
            <div className="flex items-start justify-between">
              <div>
                <ReviewStars rating={review.rating} />
                {review.title && (
                  <h4 className="mt-2 font-semibold text-gray-900">{review.title}</h4>
                )}
              </div>
              <span className="text-sm text-gray-400">{review.date}</span>
            </div>

            <p className="mt-2 text-gray-700 leading-relaxed">{review.content}</p>

            {showMedia && review.media && review.media.length > 0 && (
              <div className="mt-3 flex gap-2">
                {review.media.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Review photo ${i + 1}`}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{review.author}</span>
                {showVerifiedBadge && review.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified Purchase
                  </span>
                )}
              </div>

              {showHelpful && (
                <button
                  onClick={() => markHelpful(index)}
                  className={clsx(
                    'ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                    helpfulIds.has(index)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Helpful ({helpfulIds.has(index) ? review.helpful + 1 : review.helpful})
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + maxReviews)}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Show More Reviews
          </button>
        </div>
      )}
    </div>
  );
};
