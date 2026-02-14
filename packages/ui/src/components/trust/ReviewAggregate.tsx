import React from 'react';
import { clsx } from 'clsx';
import { Star, Pencil } from 'lucide-react';

export interface ReviewDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReviewAggregateProps {
  averageRating?: number;
  totalReviews?: number;
  distribution?: ReviewDistribution;
  showAverage?: boolean;
  showDistribution?: boolean;
  showTotalCount?: boolean;
  showWriteReview?: boolean;
  className?: string;
}

function StarRating({ rating, size = 20 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        return (
          <div key={star} className="relative" style={{ width: size, height: size }}>
            <Star size={size} className="text-gray-200" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star size={size} className="fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const ReviewAggregate: React.FC<ReviewAggregateProps> = ({
  averageRating = 0,
  totalReviews = 0,
  distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  showAverage = true,
  showDistribution = true,
  showTotalCount = true,
  showWriteReview = true,
  className,
}) => {
  const totalDistribution = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <div
      className={clsx(
        'flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 md:flex-row md:items-start',
        className,
      )}
    >
      {/* Average Rating */}
      {showAverage && (
        <div className="flex flex-col items-center text-center md:min-w-[160px]">
          <span className="text-5xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
          </span>
          <div className="mt-2">
            <StarRating rating={averageRating} size={22} />
          </div>
          {showTotalCount && (
            <p className="mt-1 text-sm text-gray-500">
              Based on {totalReviews.toLocaleString()} reviews
            </p>
          )}
          {showWriteReview && (
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <Pencil className="h-4 w-4" />
              Write a Review
            </button>
          )}
        </div>
      )}

      {/* Distribution Bars */}
      {showDistribution && (
        <div className="flex-1 space-y-2">
          {([5, 4, 3, 2, 1] as const).map((stars) => {
            const count = distribution[stars] || 0;
            const pct = totalDistribution > 0 ? (count / totalDistribution) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-1 text-sm text-gray-600">
                  <span>{stars}</span>
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      stars >= 4 && 'bg-green-500',
                      stars === 3 && 'bg-yellow-400',
                      stars <= 2 && 'bg-red-400',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm text-gray-500">
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
