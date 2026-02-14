import React, { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface LightboxProps {
  images?: LightboxImage[];
  showThumbnails?: boolean;
  showCaptions?: boolean;
  showCounter?: boolean;
  enableZoom?: boolean;
  enableSlideshow?: boolean;
  slideshowInterval?: number;
  backgroundColor?: string;
  className?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  images = [],
  showThumbnails = true,
  showCaptions = true,
  showCounter = true,
  enableZoom = true,
  enableSlideshow = false,
  slideshowInterval = 3000,
  backgroundColor = 'rgba(0, 0, 0, 0.95)',
  className,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOpen = activeIndex !== null;

  const open = useCallback((index: number) => {
    setActiveIndex(index);
    setZoomed(false);
  }, []);

  const close = useCallback(() => {
    setActiveIndex(null);
    setZoomed(false);
    setIsPlaying(false);
    if (slideshowRef.current) clearInterval(slideshowRef.current);
  }, []);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null,
    );
    setZoomed(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) =>
      prev !== null ? (prev + 1) % images.length : null,
    );
    setZoomed(false);
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    },
    [isOpen, close, goToPrev, goToNext],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isPlaying && isOpen) {
      slideshowRef.current = setInterval(() => {
        goToNext();
      }, slideshowInterval);
      return () => {
        if (slideshowRef.current) clearInterval(slideshowRef.current);
      };
    }
  }, [isPlaying, isOpen, slideshowInterval, goToNext]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (images.length === 0) return null;

  return (
    <div className={className}>
      {/* Thumbnail Grid Trigger */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => open(index)}
            className="group relative overflow-hidden rounded-lg"
            aria-label={`View ${image.alt} in lightbox`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20">
              <ZoomIn className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Overlay */}
      {isOpen && activeIndex !== null && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor }}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          tabIndex={-1}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {showCounter && (
                <span className="text-sm text-white/70">
                  {activeIndex + 1} of {images.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {enableSlideshow && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={isPlaying ? 'Pause slideshow' : 'Start slideshow'}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
              )}
              {enableZoom && (
                <button
                  onClick={() => setZoomed(!zoomed)}
                  className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                >
                  {zoomed ? (
                    <ZoomOut className="h-5 w-5" />
                  ) : (
                    <ZoomIn className="h-5 w-5" />
                  )}
                </button>
              )}
              <button
                onClick={close}
                className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close lightbox"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Image */}
          <div className="relative flex flex-1 items-center justify-center px-16">
            <button
              onClick={goToPrev}
              className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div
              className={clsx(
                'flex max-h-[70vh] items-center justify-center transition-transform duration-300',
                zoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in',
              )}
              onClick={() => enableZoom && setZoomed(!zoomed)}
            >
              <img
                src={images[activeIndex]!.src}
                alt={images[activeIndex]!.alt}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>

            <button
              onClick={goToNext}
              className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Caption */}
          {showCaptions && images[activeIndex]?.caption && (
            <div className="px-4 py-2 text-center">
              <p className="text-sm text-white/80">{images[activeIndex]?.caption}</p>
            </div>
          )}

          {/* Thumbnails */}
          {showThumbnails && (
            <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActiveIndex(index);
                    setZoomed(false);
                  }}
                  className={clsx(
                    'flex-shrink-0 overflow-hidden rounded-md transition-all',
                    activeIndex === index
                      ? 'ring-2 ring-white'
                      : 'opacity-50 hover:opacity-80',
                  )}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-12 w-12 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
