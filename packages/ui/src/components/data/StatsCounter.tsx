import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { useInView } from 'react-intersection-observer';
import * as LucideIcons from 'lucide-react';

export interface StatItem {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  icon?: string;
}

export interface StatsCounterProps {
  stats?: StatItem[];
  columns?: 'auto' | 2 | 3 | 4;
  animateOnScroll?: boolean;
  animationDuration?: number;
  separator?: 'comma' | 'space' | 'none';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showDividers?: boolean;
  className?: string;
}

const columnsMap: Record<string, string> = {
  auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const sizeMap = {
  small: {
    value: 'text-2xl font-bold',
    label: 'text-xs',
    icon: 20,
  },
  medium: {
    value: 'text-3xl font-bold',
    label: 'text-sm',
    icon: 24,
  },
  large: {
    value: 'text-4xl font-extrabold',
    label: 'text-base',
    icon: 30,
  },
  xlarge: {
    value: 'text-5xl font-extrabold',
    label: 'text-lg',
    icon: 36,
  },
};

function formatNumber(num: number, separator: 'comma' | 'space' | 'none'): string {
  if (separator === 'none') return num.toString();
  const parts = num.toString().split('.');
  const sep = separator === 'comma' ? ',' : ' ';
  parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return parts.join('.');
}

function getLucideIcon(name: string): React.ElementType | null {
  const formatted = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return (LucideIcons as unknown as Record<string, React.ElementType>)[formatted] ?? null;
}

function useCountUp(
  target: number,
  duration: number,
  shouldAnimate: boolean,
): number {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    },
    [target, duration],
  );

  useEffect(() => {
    if (!shouldAnimate) {
      setCount(target);
      return;
    }

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [shouldAnimate, target, animate]);

  return count;
}

const StatItemComponent: React.FC<{
  stat: StatItem;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  separator: 'comma' | 'space' | 'none';
  shouldAnimate: boolean;
  animationDuration: number;
}> = ({ stat, size, separator, shouldAnimate, animationDuration }) => {
  const displayValue = useCountUp(
    stat.value,
    animationDuration,
    shouldAnimate,
  );

  const IconComponent = stat.icon ? getLucideIcon(stat.icon) : null;
  const sizeConfig = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      {IconComponent && (
        <IconComponent
          size={sizeConfig.icon}
          className="text-blue-500 mb-1"
        />
      )}
      <div className={clsx(sizeConfig.value, 'text-gray-900 tabular-nums')}>
        {stat.prefix && <span>{stat.prefix}</span>}
        {formatNumber(displayValue, separator)}
        {stat.suffix && <span>{stat.suffix}</span>}
      </div>
      <div className={clsx(sizeConfig.label, 'text-gray-500')}>
        {stat.label}
      </div>
    </div>
  );
};

export const StatsCounter: React.FC<StatsCounterProps> = ({
  stats = [],
  columns = 'auto',
  animateOnScroll = true,
  animationDuration = 2000,
  separator = 'comma',
  size = 'large',
  showDividers = false,
  className,
}) => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const shouldAnimate = animateOnScroll ? inView : true;

  return (
    <div
      ref={ref}
      className={clsx(
        'grid w-full',
        columnsMap[String(columns)],
        showDividers && 'divide-x divide-gray-200',
        className,
      )}
    >
      {stats.map((stat, index) => (
        <StatItemComponent
          key={index}
          stat={stat}
          size={size}
          separator={separator}
          shouldAnimate={shouldAnimate}
          animationDuration={animationDuration}
        />
      ))}
    </div>
  );
};
