'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import gsap from 'gsap';

/* ── Types ──────────────────────────────────────────────────── */

export interface SliderLayer {
  layerType: 'text' | 'image' | 'button' | 'shape' | 'icon';
  content: string;
  imageSrc?: string | null;
  x: number;
  y: number;
  width: string;
  height: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string | null;
  borderRadius: string;
  padding: string;
  zIndex: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  animationInDelay: number;
  loopAnimation: string;
  clickAction: string;
  clickUrl?: string | null;
  hideOnMobile: boolean;
  hideOnTablet: boolean;
}

export interface SliderSlide {
  title: string;
  backgroundType: 'color' | 'image' | 'gradient' | 'video';
  backgroundValue: string;
  backgroundImage?: string | null;
  kenBurns?: boolean;
  overlay?: string;
  duration: number;
  layers: SliderLayer[];
}

export interface EnhancedSliderProps {
  layout?: 'auto' | 'full-width' | 'full-screen';
  height?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  transition?: 'fade' | 'slide-h' | 'slide-v' | 'curtain';
  transitionDuration?: number;
  showArrows?: boolean;
  showBullets?: boolean;
  showProgressBar?: boolean;
  slides?: SliderSlide[];
  className?: string;
}

/* ── Animation Presets ──────────────────────────────────────── */

function getAnimationFrom(anim: string): gsap.TweenVars {
  switch (anim) {
    case 'fade':        return { opacity: 0 };
    case 'slide-left':  return { opacity: 0, x: -60 };
    case 'slide-right': return { opacity: 0, x: 60 };
    case 'slide-up':    return { opacity: 0, y: 40 };
    case 'slide-down':  return { opacity: 0, y: -40 };
    case 'zoom-in':     return { opacity: 0, scale: 0.5 };
    case 'zoom-out':    return { opacity: 0, scale: 1.5 };
    case 'rotate':      return { opacity: 0, rotation: -15 };
    default:            return {};
  }
}

function getAnimationTo(anim: string): gsap.TweenVars {
  switch (anim) {
    case 'fade':        return { opacity: 0 };
    case 'slide-left':  return { opacity: 0, x: 60 };
    case 'slide-right': return { opacity: 0, x: -60 };
    case 'slide-up':    return { opacity: 0, y: -40 };
    case 'slide-down':  return { opacity: 0, y: 40 };
    case 'zoom-in':     return { opacity: 0, scale: 1.5 };
    case 'zoom-out':    return { opacity: 0, scale: 0.5 };
    case 'rotate':      return { opacity: 0, rotation: 15 };
    default:            return {};
  }
}

function applyLoopAnimation(el: HTMLElement, anim: string) {
  switch (anim) {
    case 'pulse':
      return gsap.to(el, { scale: 1.05, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    case 'bounce':
      return gsap.to(el, { y: -10, duration: 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    case 'rotate':
      return gsap.to(el, { rotation: 360, duration: 4, repeat: -1, ease: 'none' });
    case 'float':
      return gsap.to(el, { y: -8, x: 4, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    default:
      return null;
  }
}

/* ── Slide Background ───────────────────────────────────────── */

const SlideBackground: React.FC<{
  slide: SliderSlide;
  isActive: boolean;
}> = ({ slide, isActive }) => {
  const bgStyle: React.CSSProperties = { position: 'absolute', inset: 0 };

  if (slide.backgroundType === 'color') {
    bgStyle.backgroundColor = slide.backgroundValue || '#1a1a2e';
  } else if (slide.backgroundType === 'gradient') {
    bgStyle.background = slide.backgroundValue || 'linear-gradient(135deg, #667eea, #764ba2)';
  } else if (slide.backgroundType === 'image' && slide.backgroundImage) {
    bgStyle.backgroundImage = `url(${slide.backgroundImage})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }

  const overlayStyle: React.CSSProperties | undefined =
    slide.overlay === 'dark'     ? { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' } :
    slide.overlay === 'light'    ? { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.3)' } :
    slide.overlay === 'gradient' ? { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))' } :
    undefined;

  return (
    <>
      <div
        style={bgStyle}
        className={clsx(
          slide.kenBurns && isActive && 'animate-[kenBurns_8s_ease-in-out_infinite_alternate]',
        )}
      />
      {slide.backgroundType === 'video' && slide.backgroundValue && (
        <video
          src={slide.backgroundValue}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {overlayStyle && <div style={overlayStyle} />}
    </>
  );
};

/* ── Layer Renderer ─────────────────────────────────────────── */

const LayerRenderer: React.FC<{
  layer: SliderLayer;
  isActive: boolean;
  slideIndex: number;
}> = ({ layer, isActive, slideIndex }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const loopTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    // Kill any running animations on this element
    gsap.killTweensOf(el);
    if (loopTweenRef.current) {
      loopTweenRef.current.kill();
      loopTweenRef.current = null;
    }

    if (isActive) {
      // Entrance animation
      const from = getAnimationFrom(layer.animationIn);
      if (Object.keys(from).length > 0) {
        gsap.fromTo(el, from, {
          opacity: 1, x: 0, y: 0, scale: 1, rotation: 0,
          duration: layer.animationInDuration / 1000,
          delay: layer.animationInDelay / 1000,
          ease: 'power2.out',
          onComplete: () => {
            // Start loop animation after entrance
            if (layer.loopAnimation && layer.loopAnimation !== 'none') {
              loopTweenRef.current = applyLoopAnimation(el, layer.loopAnimation);
            }
          },
        });
      } else {
        gsap.set(el, { opacity: 1 });
        if (layer.loopAnimation && layer.loopAnimation !== 'none') {
          loopTweenRef.current = applyLoopAnimation(el, layer.loopAnimation);
        }
      }
    } else {
      // Exit animation
      const to = getAnimationTo(layer.animationOut);
      if (Object.keys(to).length > 0) {
        gsap.to(el, {
          ...to,
          duration: layer.animationOutDuration / 1000,
          ease: 'power2.in',
        });
      } else {
        gsap.set(el, { opacity: 0 });
      }
    }

    return () => {
      gsap.killTweensOf(el);
      if (loopTweenRef.current) loopTweenRef.current.kill();
    };
  }, [isActive, slideIndex, layer]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: layer.zIndex,
    fontSize: `${layer.fontSize}px`,
    fontWeight: layer.fontWeight,
    color: layer.color || '#fff',
    width: layer.width !== 'auto' ? layer.width : undefined,
    height: layer.height !== 'auto' ? layer.height : undefined,
    opacity: 0, // Start hidden, GSAP reveals
  };

  if (layer.backgroundColor) {
    style.backgroundColor = layer.backgroundColor;
    style.borderRadius = layer.borderRadius || '0';
    style.padding = layer.padding || '0';
  }

  const handleClick = () => {
    if (layer.clickAction === 'url' && layer.clickUrl) {
      window.open(layer.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isClickable = layer.clickAction === 'url' && layer.clickUrl;

  const content = (() => {
    switch (layer.layerType) {
      case 'image':
        return layer.imageSrc ? (
          <img
            src={layer.imageSrc}
            alt={layer.content || ''}
            className="max-w-full"
            style={{ borderRadius: layer.borderRadius }}
          />
        ) : null;
      case 'button':
        return (
          <span
            className="inline-block whitespace-nowrap"
            style={{
              padding: layer.padding || '12px 32px',
              borderRadius: layer.borderRadius || '8px',
              backgroundColor: layer.backgroundColor || '#3b82f6',
              color: layer.color || '#fff',
              fontWeight: layer.fontWeight,
              fontSize: `${layer.fontSize}px`,
              cursor: isClickable ? 'pointer' : undefined,
            }}
          >
            {layer.content}
          </span>
        );
      case 'shape':
        return (
          <div
            style={{
              width: layer.width !== 'auto' ? layer.width : '100px',
              height: layer.height !== 'auto' ? layer.height : '100px',
              backgroundColor: layer.backgroundColor || '#ffffff33',
              borderRadius: layer.borderRadius,
            }}
          />
        );
      case 'icon':
        return <span style={{ fontSize: `${layer.fontSize * 1.5}px` }}>{layer.content}</span>;
      case 'text':
      default:
        return <span className="whitespace-pre-wrap text-center">{layer.content}</span>;
    }
  })();

  // For button type, don't apply background/padding at the wrapper level
  const wrapperStyle = layer.layerType === 'button'
    ? { ...style, backgroundColor: undefined, padding: undefined, borderRadius: undefined }
    : style;

  return (
    <div
      ref={layerRef}
      style={wrapperStyle}
      className={clsx(
        isClickable && 'cursor-pointer',
        layer.hideOnMobile && 'max-sm:hidden',
        layer.hideOnTablet && 'max-md:hidden md:max-lg:block',
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      {content}
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────── */

export const EnhancedSlider: React.FC<EnhancedSliderProps> = ({
  layout = 'full-width',
  height = 500,
  autoplay = true,
  autoplayInterval = 5000,
  pauseOnHover = true,
  loop = true,
  transition = 'fade',
  transitionDuration = 800,
  showArrows = true,
  showBullets = true,
  showProgressBar = false,
  slides = [],
  className,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideCount = slides.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (slideCount === 0) return;
      let nextIndex = index;
      if (nextIndex >= slideCount) nextIndex = loop ? 0 : slideCount - 1;
      if (nextIndex < 0) nextIndex = loop ? slideCount - 1 : 0;

      const currentEl = slideRefs.current[currentSlide];
      const nextEl = slideRefs.current[nextIndex];

      if (currentEl && nextEl && currentSlide !== nextIndex) {
        const dur = transitionDuration / 1000;

        switch (transition) {
          case 'slide-h':
            gsap.set(nextEl, { x: nextIndex > currentSlide ? '100%' : '-100%', opacity: 1, visibility: 'visible' });
            gsap.to(currentEl, { x: nextIndex > currentSlide ? '-100%' : '100%', duration: dur, ease: 'power2.inOut' });
            gsap.to(nextEl, { x: '0%', duration: dur, ease: 'power2.inOut' });
            break;
          case 'slide-v':
            gsap.set(nextEl, { y: nextIndex > currentSlide ? '100%' : '-100%', opacity: 1, visibility: 'visible' });
            gsap.to(currentEl, { y: nextIndex > currentSlide ? '-100%' : '100%', duration: dur, ease: 'power2.inOut' });
            gsap.to(nextEl, { y: '0%', duration: dur, ease: 'power2.inOut' });
            break;
          case 'curtain':
            gsap.set(nextEl, { clipPath: 'inset(0 100% 0 0)', opacity: 1, visibility: 'visible' });
            gsap.to(nextEl, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease: 'power2.inOut' });
            gsap.to(currentEl, { opacity: 0, duration: dur * 0.5, delay: dur * 0.5 });
            break;
          case 'fade':
          default:
            gsap.set(nextEl, { opacity: 0, visibility: 'visible' });
            gsap.to(currentEl, { opacity: 0, duration: dur, ease: 'power1.inOut' });
            gsap.to(nextEl, { opacity: 1, duration: dur, ease: 'power1.inOut' });
            break;
        }
      }

      setCurrentSlide(nextIndex);
      setProgress(0);
    },
    [currentSlide, slideCount, loop, transition, transitionDuration],
  );

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || isPaused || slideCount <= 1) return;

    autoplayRef.current = setInterval(() => {
      nextSlide();
    }, autoplayInterval);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, isPaused, autoplayInterval, slideCount, nextSlide]);

  // Progress bar
  useEffect(() => {
    if (!showProgressBar || !autoplay || isPaused || slideCount <= 1) return;

    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / autoplayInterval) * 100, 100));
    }, 50);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [showProgressBar, autoplay, isPaused, autoplayInterval, slideCount, currentSlide]);

  // Initialize slide visibility
  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === currentSlide) {
        gsap.set(el, { opacity: 1, x: 0, y: 0, visibility: 'visible', clipPath: 'none' });
      } else {
        gsap.set(el, { opacity: 0, visibility: 'hidden' });
      }
    });
  }, [slideCount]); // Only on mount / slide count change

  // Keyboard nav
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      else if (e.key === 'ArrowRight') nextSlide();
    };
    container.addEventListener('keydown', handleKey);
    return () => container.removeEventListener('keydown', handleKey);
  }, [nextSlide, prevSlide]);

  if (slideCount === 0) {
    return (
      <div
        className={clsx('flex items-center justify-center bg-gray-900 text-gray-400', className)}
        style={{ height }}
      >
        No slides configured
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    height: layout === 'full-screen' ? '100vh' : height,
    width: layout === 'full-width' || layout === 'full-screen' ? '100%' : undefined,
    maxWidth: layout === 'auto' ? '100%' : undefined,
  };

  return (
    <div
      ref={containerRef}
      className={clsx('relative overflow-hidden bg-black', className)}
      style={containerStyle}
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
      tabIndex={0}
      role="region"
      aria-label="Image slider"
      aria-roledescription="carousel"
    >
      {/* Slides */}
      {slides.map((slide, slideIndex) => (
        <div
          key={slideIndex}
          ref={(el) => { slideRefs.current[slideIndex] = el; }}
          className="absolute inset-0"
          style={{ visibility: slideIndex === currentSlide ? 'visible' : 'hidden' }}
          role="group"
          aria-roledescription="slide"
          aria-label={slide.title || `Slide ${slideIndex + 1}`}
        >
          <SlideBackground slide={slide} isActive={slideIndex === currentSlide} />
          {slide.layers.map((layer, layerIndex) => (
            <LayerRenderer
              key={layerIndex}
              layer={layer}
              isActive={slideIndex === currentSlide}
              slideIndex={slideIndex}
            />
          ))}
        </div>
      ))}

      {/* Navigation Arrows */}
      {showArrows && slideCount > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Previous slide"
          >
            &#x2039;
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Next slide"
          >
            &#x203A;
          </button>
        </>
      )}

      {/* Bullet Navigation */}
      {showBullets && slideCount > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={clsx(
                'h-2.5 rounded-full transition-all',
                i === currentSlide ? 'w-6 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70',
              )}
              aria-label={`Go to ${slide.title || `slide ${i + 1}`}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {showProgressBar && autoplay && slideCount > 1 && (
        <div className="absolute bottom-0 left-0 z-20 h-0.5 w-full bg-white/20">
          <div
            className="h-full bg-white/80 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
