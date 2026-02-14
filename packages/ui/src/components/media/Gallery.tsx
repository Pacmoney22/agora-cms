import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface GalleryProps {
  images: GalleryImage[];
  layout?: 'grid' | 'masonry' | 'collage' | 'filmstrip';
  columns?: number;
  gap?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  lightbox?: boolean;
  showCaptions?: 'always' | 'hover' | 'lightbox-only' | 'hidden';
  className?: string;
}

const gapMap: Record<string, string> = {
  none: 'gap-0',
  small: 'gap-1',
  medium: 'gap-3',
  large: 'gap-6',
};

const masonryGapMap: Record<string, string> = {
  none: 'gap-0 [&>*]:mb-0',
  small: 'gap-1 [&>*]:mb-1',
  medium: 'gap-3 [&>*]:mb-3',
  large: 'gap-6 [&>*]:mb-6',
};

const radiusMap: Record<string, string> = {
  none: 'rounded-none',
  small: 'rounded',
  medium: 'rounded-lg',
  large: 'rounded-2xl',
};

const columnCountMap: Record<number, string> = {
  2: 'columns-2',
  3: 'columns-3',
  4: 'columns-4',
  5: 'columns-5',
  6: 'columns-6',
};

const gridColsMap: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export const Gallery: React.FC<GalleryProps> = ({
  images = [],
  layout = 'grid',
  columns = 3,
  gap = 'medium',
  borderRadius = 'small',
  lightbox = true,
  showCaptions = 'hover',
  className,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback(
    (index: number) => {
      if (lightbox) setLightboxIndex(index);
    },
    [lightbox],
  );

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null,
    );
  }, [images.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % images.length : null,
    );
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    },
    [closeLightbox, goToPrev, goToNext],
  );

  const clampedCols = Math.max(2, Math.min(6, columns));

  const renderCaption = (caption: string | undefined, context: 'gallery' | 'lightbox') => {
    if (!caption) return null;
    if (showCaptions === 'hidden') return null;
    if (showCaptions === 'lightbox-only' && context === 'gallery') return null;

    return (
      <span
        className={clsx(
          'text-sm',
          context === 'lightbox'
            ? 'text-white'
            : 'text-white drop-shadow-sm',
        )}
      >
        {caption}
      </span>
    );
  };

  const renderImage = (image: GalleryImage, index: number) => {
    const showOverlayCaption =
      showCaptions === 'always' || showCaptions === 'hover';

    return (
      <div
        key={index}
        className={clsx(
          'group relative overflow-hidden',
          radiusMap[borderRadius],
          lightbox && 'cursor-pointer',
          layout === 'masonry' && 'break-inside-avoid',
        )}
        onClick={() => openLightbox(index)}
        role={lightbox ? 'button' : undefined}
        tabIndex={lightbox ? 0 : undefined}
        aria-label={lightbox ? `View ${image.alt} in lightbox` : undefined}
        onKeyDown={
          lightbox
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(index);
                }
              }
            : undefined
        }
      >
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className={clsx(
            'w-full object-cover',
            layout !== 'masonry' && 'h-full',
            lightbox &&
              'transition-transform duration-300 group-hover:scale-105',
          )}
        />
        {lightbox && (
          <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        {showOverlayCaption && image.caption && (
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2',
              showCaptions === 'hover' &&
                'translate-y-full transition-transform duration-300 group-hover:translate-y-0',
            )}
          >
            {renderCaption(image.caption, 'gallery')}
          </div>
        )}
      </div>
    );
  };

  const renderGrid = () => (
    <div
      className={clsx(
        'grid',
        gridColsMap[clampedCols],
        gapMap[gap],
      )}
    >
      {images.map((image, i) => renderImage(image, i))}
    </div>
  );

  const renderMasonry = () => (
    <div
      className={clsx(
        columnCountMap[clampedCols],
        masonryGapMap[gap],
      )}
    >
      {images.map((image, i) => renderImage(image, i))}
    </div>
  );

  const renderCollage = () => {
    // First image is large, rest fill a grid
    const [first, ...rest] = images;
    if (!first) return null;

    return (
      <div className={clsx('grid grid-cols-4 grid-rows-2', gapMap[gap])}>
        <div className="col-span-2 row-span-2">
          {renderImage(first, 0)}
        </div>
        {rest.slice(0, 4).map((image, i) => (
          <div key={i + 1} className="col-span-1 row-span-1">
            {renderImage(image, i + 1)}
          </div>
        ))}
      </div>
    );
  };

  const renderFilmstrip = () => (
    <div
      className={clsx(
        'flex overflow-x-auto scrollbar-hide',
        gapMap[gap],
      )}
    >
      {images.map((image, i) => (
        <div
          key={i}
          className="flex-none"
          style={{ width: `${100 / Math.min(clampedCols, images.length)}%` }}
        >
          {renderImage(image, i)}
        </div>
      ))}
    </div>
  );

  const layoutRenderers: Record<string, () => React.ReactNode> = {
    grid: renderGrid,
    masonry: renderMasonry,
    collage: renderCollage,
    filmstrip: renderFilmstrip,
  };

  return (
    <div className={clsx('w-full', className)}>
      {layoutRenderers[layout]?.()}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="flex max-h-[85vh] max-w-[85vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex]!.src}
              alt={images[lightboxIndex]!.alt}
              className="max-h-[80vh] max-w-full object-contain"
            />
            {(showCaptions === 'always' ||
              showCaptions === 'hover' ||
              showCaptions === 'lightbox-only') &&
              images[lightboxIndex]?.caption && (
                <div className="mt-3 text-center">
                  {renderCaption(images[lightboxIndex]?.caption, 'lightbox')}
                </div>
              )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-4 text-sm text-white/70">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
};
