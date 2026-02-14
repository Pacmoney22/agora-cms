import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Award } from 'lucide-react';

export interface AwardItem {
  image: string;
  alt: string;
  title?: string;
  year?: string;
  issuer?: string;
  url?: string;
}

export interface AwardsProps {
  items?: AwardItem[];
  layout?: 'row' | 'grid' | 'carousel';
  maxHeight?: number;
  showTitles?: boolean;
  grayscale?: boolean;
  className?: string;
}

export const Awards: React.FC<AwardsProps> = ({
  items = [],
  layout = 'row',
  maxHeight = 80,
  showTitles = true,
  grayscale = false,
  className,
}) => {
  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const renderItem = (item: AwardItem, index: number) => {
    const content = (
      <div
        key={index}
        className={clsx(
          'flex flex-col items-center text-center',
          layout === 'carousel' && 'flex-shrink-0 px-4',
        )}
      >
        <img
          src={item.image}
          alt={item.alt}
          className={clsx(
            'object-contain transition-all duration-300',
            grayscale && 'grayscale hover:grayscale-0',
            item.url && 'cursor-pointer',
          )}
          style={{ maxHeight: `${maxHeight}px` }}
        />
        {showTitles && (item.title || item.year) && (
          <div className="mt-2">
            {item.title && (
              <p className="text-sm font-medium text-gray-700">{item.title}</p>
            )}
            {item.year && (
              <p className="text-xs text-gray-400">{item.year}</p>
            )}
            {item.issuer && (
              <p className="text-xs text-gray-500">{item.issuer}</p>
            )}
          </div>
        )}
      </div>
    );

    if (item.url) {
      return (
        <a
          key={index}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          {content}
        </a>
      );
    }

    return content;
  };

  if (layout === 'carousel') {
    return (
      <div className={clsx('relative w-full', className)}>
        <button
          onClick={() => scrollCarousel('prev')}
          className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
          aria-label="Previous awards"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide py-2"
        >
          {items.map((item, i) => renderItem(item, i))}
        </div>

        <button
          onClick={() => scrollCarousel('next')}
          className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
          aria-label="Next awards"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div
        className={clsx(
          'grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4',
          className,
        )}
      >
        {items.map((item, i) => renderItem(item, i))}
      </div>
    );
  }

  // Row layout
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-center gap-8',
        className,
      )}
    >
      {items.map((item, i) => renderItem(item, i))}
    </div>
  );
};
