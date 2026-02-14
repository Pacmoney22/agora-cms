import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useInView } from 'react-intersection-observer';

export interface ProgressBarProps {
  value?: number;
  label?: string | null;
  showPercentage?: boolean;
  color?: string;
  height?: 'thin' | 'medium' | 'thick';
  animated?: boolean;
  style?: 'linear' | 'circular' | 'semicircle';
  className?: string;
}

const heightMap: Record<string, string> = {
  thin: 'h-1.5',
  medium: 'h-3',
  thick: 'h-5',
};

const circularSizeMap: Record<string, number> = {
  thin: 80,
  medium: 120,
  thick: 160,
};

const strokeWidthMap: Record<string, number> = {
  thin: 4,
  medium: 8,
  thick: 12,
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  label = null,
  showPercentage = true,
  color = '#3b82f6',
  height = 'medium',
  animated = true,
  style = 'linear',
  className,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  const [animatedValue, setAnimatedValue] = useState(animated ? 0 : clampedValue);

  useEffect(() => {
    if (!animated) {
      setAnimatedValue(clampedValue);
      return;
    }

    if (inView) {
      const startTime = performance.now();
      const duration = 1000;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(Math.round(eased * clampedValue));

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    }
  }, [inView, clampedValue, animated]);

  const renderLinear = () => (
    <div>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-500">
              {animatedValue}%
            </span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-gray-200',
          heightMap[height],
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${clampedValue}%`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-1000 ease-out',
          )}
          style={{
            width: `${animatedValue}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );

  const renderCircular = () => {
    const size = circularSizeMap[height]!;
    const strokeWidth = strokeWidthMap[height]!;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedValue / 100) * circumference;
    const center = size / 2;

    return (
      <div
        className="flex flex-col items-center gap-2"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${clampedValue}%`}
      >
        <div className="relative inline-flex items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {showPercentage && (
            <span
              className={clsx(
                'absolute font-bold text-gray-800',
                height === 'thin' && 'text-xs',
                height === 'medium' && 'text-lg',
                height === 'thick' && 'text-2xl',
              )}
            >
              {animatedValue}%
            </span>
          )}
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
      </div>
    );
  };

  const renderSemicircle = () => {
    const size = circularSizeMap[height]!;
    const strokeWidth = strokeWidthMap[height]!;
    const radius = (size - strokeWidth) / 2;
    const semicircumference = Math.PI * radius;
    const strokeDashoffset =
      semicircumference - (animatedValue / 100) * semicircumference;
    const center = size / 2;

    return (
      <div
        className="flex flex-col items-center gap-1"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${clampedValue}%`}
      >
        <div className="relative inline-flex items-end justify-center">
          <svg
            width={size}
            height={size / 2 + strokeWidth}
            viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          >
            <path
              d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={semicircumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {showPercentage && (
            <span
              className={clsx(
                'absolute font-bold text-gray-800',
                height === 'thin' && 'text-xs bottom-0',
                height === 'medium' && 'text-base bottom-0',
                height === 'thick' && 'text-xl bottom-1',
              )}
            >
              {animatedValue}%
            </span>
          )}
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
      </div>
    );
  };

  const renderers: Record<string, () => React.ReactNode> = {
    linear: renderLinear,
    circular: renderCircular,
    semicircle: renderSemicircle,
  };

  return (
    <div ref={ref} className={clsx('w-full', className)}>
      {renderers[style]?.()}
    </div>
  );
};
