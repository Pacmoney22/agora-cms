import React, { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

export interface BeforeAfterProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  orientation?: 'horizontal' | 'vertical';
  initialPosition?: number;
  showLabels?: boolean;
  aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1';
  className?: string;
}

const aspectRatioMap: Record<string, string> = {
  'auto': '',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeImage = '',
  afterImage = '',
  beforeLabel = 'Before',
  afterLabel = 'After',
  orientation = 'horizontal',
  initialPosition = 50,
  showLabels = true,
  aspectRatio = 'auto',
  className,
}) => {
  const [position, setPosition] = useState(Math.min(100, Math.max(0, initialPosition)));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = orientation === 'horizontal';

  const getPositionFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return position;
      const rect = containerRef.current.getBoundingClientRect();
      let newPos: number;
      if (isHorizontal) {
        newPos = ((clientX - rect.left) / rect.width) * 100;
      } else {
        newPos = ((clientY - rect.top) / rect.height) * 100;
      }
      return Math.min(100, Math.max(0, newPos));
    },
    [isHorizontal, position],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setPosition(getPositionFromEvent(e.clientX, e.clientY));
    },
    [getPositionFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPosition(getPositionFromEvent(e.clientX, e.clientY));
    },
    [isDragging, getPositionFromEvent],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((prev) => Math.max(0, prev - step));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition((prev) => Math.min(100, prev + step));
      }
    },
    [],
  );

  const clipBefore = isHorizontal
    ? `inset(0 ${100 - position}% 0 0)`
    : `inset(0 0 ${100 - position}% 0)`;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative select-none overflow-hidden',
        aspectRatioMap[aspectRatio],
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* After image (full, shown behind) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="block h-full w-full object-cover"
        draggable={false}
      />

      {/* Before image (clipped overlay) */}
      <img
        src={beforeImage}
        alt={beforeLabel}
        className="absolute inset-0 block h-full w-full object-cover"
        style={{ clipPath: clipBefore }}
        draggable={false}
      />

      {/* Labels */}
      {showLabels && (
        <>
          <span
            className={clsx(
              'absolute rounded bg-black/60 px-2.5 py-1 text-xs font-medium text-white',
              isHorizontal ? 'left-3 top-3' : 'left-3 top-3',
            )}
          >
            {beforeLabel}
          </span>
          <span
            className={clsx(
              'absolute rounded bg-black/60 px-2.5 py-1 text-xs font-medium text-white',
              isHorizontal ? 'right-3 top-3' : 'bottom-3 right-3',
            )}
          >
            {afterLabel}
          </span>
        </>
      )}

      {/* Divider line */}
      <div
        className={clsx(
          'absolute bg-white shadow-md',
          isHorizontal
            ? 'top-0 h-full w-0.5 -translate-x-1/2'
            : 'left-0 h-0.5 w-full -translate-y-1/2',
        )}
        style={
          isHorizontal
            ? { left: `${position}%` }
            : { top: `${position}%` }
        }
      />

      {/* Slider handle */}
      <div
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={clsx(
          'absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white bg-white shadow-lg active:cursor-grabbing',
        )}
        style={
          isHorizontal
            ? { left: `${position}%`, top: '50%' }
            : { top: `${position}%`, left: '50%' }
        }
      >
        {isHorizontal ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600">
            <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600">
            <path d="M3 5L8 2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 11L8 14L13 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
