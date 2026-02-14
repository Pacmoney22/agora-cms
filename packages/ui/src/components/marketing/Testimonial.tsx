import React from 'react';
import { clsx } from 'clsx';
import { Star, Quote } from 'lucide-react';

export interface TestimonialProps {
  quote?: string;
  author?: string;
  authorTitle?: string | null;
  authorImage?: string | null;
  companyLogo?: string | null;
  rating?: number | null;
  style?: 'card' | 'minimal' | 'bubble' | 'large-quote' | 'video';
  videoUrl?: string | null;
  className?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          className={clsx(
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
          )}
        />
      ))}
    </div>
  );
}

function ReviewJsonLd({ quote, author, rating }: { quote: string; author: string; rating: number }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody: quote,
    author: {
      '@type': 'Person',
      name: author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: 5,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export const Testimonial: React.FC<TestimonialProps> = ({
  quote = 'This product has been amazing for our team.',
  author = 'Jane Doe',
  authorTitle = null,
  authorImage = null,
  companyLogo = null,
  rating = null,
  style = 'card',
  videoUrl = null,
  className,
}) => {
  const isVideo = style === 'video' && videoUrl;

  return (
    <>
      {rating != null && rating >= 1 && rating <= 5 && (
        <ReviewJsonLd quote={quote} author={author} rating={rating} />
      )}

      <figure
        className={clsx(
          'relative w-full',
          style === 'card' && 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          style === 'minimal' && 'py-4',
          style === 'bubble' && 'rounded-2xl bg-gray-50 p-6 relative after:absolute after:bottom-0 after:left-8 after:translate-y-full after:border-8 after:border-transparent after:border-t-gray-50',
          style === 'large-quote' && 'py-8 px-4 text-center',
          style === 'video' && 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          className,
        )}
      >
        {style === 'large-quote' && (
          <Quote
            size={48}
            className="mx-auto mb-4 text-gray-200"
          />
        )}

        {rating != null && rating >= 1 && rating <= 5 && (
          <div className={clsx('mb-3', style === 'large-quote' && 'flex justify-center')}>
            <StarRating rating={rating} />
          </div>
        )}

        <blockquote
          className={clsx(
            'text-gray-700 leading-relaxed',
            style === 'large-quote' ? 'text-xl md:text-2xl italic' : 'text-base',
            style === 'minimal' && 'italic border-l-4 border-blue-500 pl-4',
          )}
        >
          <p>{style === 'large-quote' ? `"${quote}"` : quote}</p>
        </blockquote>

        {isVideo && (
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={videoUrl}
              title={`Video testimonial from ${author}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <figcaption
          className={clsx(
            'mt-4 flex items-center gap-3',
            style === 'large-quote' && 'justify-center',
            style === 'bubble' && 'mt-8',
          )}
        >
          {authorImage && (
            <img
              src={authorImage}
              alt={author}
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
          <div>
            <cite className="not-italic font-medium text-gray-900">{author}</cite>
            {authorTitle && (
              <p className="text-sm text-gray-500">{authorTitle}</p>
            )}
          </div>
          {companyLogo && (
            <img
              src={companyLogo}
              alt=""
              className="ml-auto h-8 object-contain opacity-60"
            />
          )}
        </figcaption>
      </figure>
    </>
  );
};
