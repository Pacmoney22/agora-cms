import React, { useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export interface TestimonialSlide {
  quote: string;
  author: string;
  authorTitle?: string | null;
  authorImage?: string | null;
  rating?: number | null;
}

export interface TestimonialCarouselProps {
  testimonials?: TestimonialSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  visibleCount?: 1 | 2 | 3;
  className?: string;
}

function SlideStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={clsx(
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
          )}
        />
      ))}
    </div>
  );
}

export const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({
  testimonials = [],
  autoplay = false,
  autoplayInterval = 5000,
  showDots = true,
  showArrows = true,
  visibleCount = 1,
  className,
}) => {
  const slideSizeMap: Record<number, string> = {
    1: 'min-w-0 flex-[0_0_100%]',
    2: 'min-w-0 flex-[0_0_50%]',
    3: 'min-w-0 flex-[0_0_33.333%]',
  };

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || !autoplay) return;

    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, autoplayInterval);

    return () => clearInterval(intervalId);
  }, [emblaApi, autoplay, autoplayInterval]);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className={clsx('relative w-full', className)} aria-roledescription="carousel" aria-label="Testimonials">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={clsx('px-3', slideSizeMap[visibleCount])}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${testimonials.length}`}
            >
              <figure className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {testimonial.rating != null && testimonial.rating >= 1 && testimonial.rating <= 5 && (
                  <div className="mb-3">
                    <SlideStarRating rating={testimonial.rating} />
                  </div>
                )}
                <blockquote className="flex-1 text-base text-gray-700 leading-relaxed">
                  <p>{testimonial.quote}</p>
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                  {testimonial.authorImage && (
                    <img
                      src={testimonial.authorImage}
                      alt={testimonial.author}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <cite className="not-italic font-medium text-gray-900 text-sm">
                      {testimonial.author}
                    </cite>
                    {testimonial.authorTitle && (
                      <p className="text-xs text-gray-500">{testimonial.authorTitle}</p>
                    )}
                  </div>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      {showArrows && testimonials.length > visibleCount && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md transition-colors hover:bg-gray-50"
            aria-label="Next testimonial"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </>
      )}

      {showDots && scrollSnaps.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={clsx(
                'h-2.5 w-2.5 rounded-full transition-colors',
                index === selectedIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400',
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
