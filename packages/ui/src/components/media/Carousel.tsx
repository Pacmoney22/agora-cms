import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CarouselSlide {
  content: string;
}

export interface CarouselProps {
  slides?: CarouselSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  slidesPerView?: number;
  gap?: 'none' | 'small' | 'medium' | 'large';
  loop?: boolean;
  transition?: 'slide' | 'fade' | 'zoom';
  aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1';
  children?: React.ReactNode;
  className?: string;
}

const gapPixelMap: Record<string, number> = {
  none: 0,
  small: 8,
  medium: 16,
  large: 32,
};

const aspectRatioMap: Record<string, string> = {
  auto: '',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

export const Carousel: React.FC<CarouselProps> = ({
  slides = [],
  autoplay = false,
  autoplayInterval = 5000,
  pauseOnHover = true,
  showArrows = true,
  showDots = true,
  slidesPerView = 1,
  gap = 'medium',
  loop = false,
  transition = 'slide',
  aspectRatio = 'auto',
  children,
  className,
}) => {
  const clampedSlidesPerView = Math.max(1, Math.min(5, slidesPerView));
  const childrenArray = React.Children.toArray(children);
  const slideCount = childrenArray.length > 0 ? childrenArray.length : slides.length;

  const isFadeOrZoom = transition === 'fade' || transition === 'zoom';

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop,
    align: 'start',
    slidesToScroll: 1,
    containScroll: isFadeOrZoom ? false : 'trimSnaps',
    ...(isFadeOrZoom ? {} : {}),
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', updateState);
    emblaApi.on('reInit', updateState);
    updateState();
    return () => {
      emblaApi.off('select', updateState);
      emblaApi.off('reInit', updateState);
    };
  }, [emblaApi, updateState]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || !emblaApi) return;
    if (pauseOnHover && isHovered) return;

    const interval = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else if (loop) {
        emblaApi.scrollTo(0);
      }
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, emblaApi, isHovered, loop, pauseOnHover]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  const renderSlideContent = (index: number) => {
    if (childrenArray.length > 0) {
      return childrenArray[index];
    }
    if (slides[index]) {
      return (
        <div
          className="flex h-full items-center justify-center p-6"
          dangerouslySetInnerHTML={{ __html: slides[index].content }}
        />
      );
    }
    return null;
  };

  const slideElements = Array.from({ length: slideCount }, (_, index) => (
    <div
      key={index}
      className={clsx(
        'relative min-w-0 shrink-0 grow-0',
        aspectRatio !== 'auto' && aspectRatioMap[aspectRatio],
        isFadeOrZoom && 'transition-opacity duration-500',
        isFadeOrZoom && index !== selectedIndex && 'opacity-0',
        transition === 'zoom' &&
          'transition-transform duration-500' &&
          index !== selectedIndex &&
          'scale-95',
      )}
      style={{
        flexBasis: `calc(${100 / clampedSlidesPerView}% - ${
          ((clampedSlidesPerView - 1) * gapPixelMap[gap]!) / clampedSlidesPerView
        }px)`,
        ...(isFadeOrZoom && index !== selectedIndex
          ? { position: 'absolute', inset: 0 }
          : {}),
      }}
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of ${slideCount}`}
    >
      {renderSlideContent(index)}
    </div>
  ));

  return (
    <div
      className={clsx('relative w-full', className)}
      aria-roledescription="carousel"
      aria-label="Carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div
          className="flex"
          style={{ gap: `${gapPixelMap[gap]}px` }}
        >
          {slideElements}
        </div>
      </div>

      {/* Arrow Navigation */}
      {showArrows && slideCount > 1 && (
        <>
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev && !loop}
            className={clsx(
              'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all hover:bg-white',
              !canScrollPrev && !loop && 'cursor-not-allowed opacity-30',
            )}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext && !loop}
            className={clsx(
              'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all hover:bg-white',
              !canScrollNext && !loop && 'cursor-not-allowed opacity-30',
            )}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </>
      )}

      {/* Dot Navigation */}
      {showDots && slideCount > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Slide navigation"
        >
          {Array.from({ length: slideCount }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === selectedIndex}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={clsx(
                'h-2.5 rounded-full transition-all',
                i === selectedIndex
                  ? 'w-6 bg-gray-800'
                  : 'w-2.5 bg-gray-300 hover:bg-gray-400',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
