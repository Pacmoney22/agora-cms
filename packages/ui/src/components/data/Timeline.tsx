import React from 'react';
import { clsx } from 'clsx';
import { useInView } from 'react-intersection-observer';
import * as LucideIcons from 'lucide-react';

export interface TimelineItem {
  date?: string;
  title: string;
  description: string;
  icon?: string;
  image?: string;
}

export interface TimelineProps {
  items?: TimelineItem[];
  layout?: 'vertical' | 'horizontal' | 'alternating';
  lineColor?: string;
  nodeColor?: string;
  showDates?: boolean;
  animated?: boolean;
  className?: string;
}

function getLucideIcon(name: string): React.ElementType | null {
  const formatted = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return (LucideIcons as unknown as Record<string, React.ElementType>)[formatted] ?? null;
}

const TimelineEntry: React.FC<{
  item: TimelineItem;
  index: number;
  total: number;
  layout: 'vertical' | 'horizontal' | 'alternating';
  lineColor: string;
  nodeColor: string;
  showDates: boolean;
  animated: boolean;
}> = ({ item, index, total, layout, lineColor, nodeColor, showDates, animated }) => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const IconComponent = item.icon ? getLucideIcon(item.icon) : null;
  const isLast = index === total - 1;
  const isLeft = layout === 'alternating' && index % 2 === 0;

  const animClass = animated
    ? clsx(
        'transition-all duration-700 ease-out',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      )
    : '';

  if (layout === 'horizontal') {
    return (
      <li
        ref={ref}
        className={clsx('relative flex flex-col items-center flex-1 min-w-[160px]', animClass)}
      >
        {/* Connecting line */}
        {!isLast && (
          <div
            className="absolute top-4 left-1/2 h-0.5 w-full"
            style={{ backgroundColor: lineColor }}
          />
        )}

        {/* Node */}
        <div
          className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white"
          style={{ borderColor: nodeColor }}
        >
          {IconComponent ? (
            <IconComponent size={14} style={{ color: nodeColor }} />
          ) : (
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: nodeColor }}
            />
          )}
        </div>

        {/* Content */}
        <div className="mt-3 flex flex-col items-center text-center px-2">
          {showDates && item.date && (
            <span className="mb-1 text-xs font-medium text-gray-400">
              {item.date}
            </span>
          )}
          {item.image && (
            <img
              src={item.image}
              alt=""
              className="mb-2 h-16 w-16 rounded-lg object-cover"
              loading="lazy"
            />
          )}
          <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            {item.description}
          </p>
        </div>
      </li>
    );
  }

  if (layout === 'alternating') {
    return (
      <li ref={ref} className={clsx('relative flex', animClass)}>
        {/* Left content */}
        <div className={clsx('flex-1 pr-8', !isLeft && 'invisible')}>
          <div className="text-right">
            {showDates && item.date && (
              <span className="mb-1 block text-xs font-medium text-gray-400">
                {item.date}
              </span>
            )}
            {isLeft && (
              <>
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="mb-2 ml-auto h-20 w-32 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <h4 className="text-base font-semibold text-gray-900">
                  {item.title}
                </h4>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Center line + node */}
        <div className="relative flex flex-col items-center">
          <div
            className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white"
            style={{ borderColor: nodeColor }}
          >
            {IconComponent ? (
              <IconComponent size={14} style={{ color: nodeColor }} />
            ) : (
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: nodeColor }}
              />
            )}
          </div>
          {!isLast && (
            <div
              className="w-0.5 flex-1"
              style={{ backgroundColor: lineColor }}
            />
          )}
        </div>

        {/* Right content */}
        <div className={clsx('flex-1 pl-8', isLeft && 'invisible')}>
          <div>
            {showDates && item.date && (
              <span className="mb-1 block text-xs font-medium text-gray-400">
                {item.date}
              </span>
            )}
            {!isLeft && (
              <>
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="mb-2 h-20 w-32 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <h4 className="text-base font-semibold text-gray-900">
                  {item.title}
                </h4>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </>
            )}
          </div>
        </div>
      </li>
    );
  }

  // Vertical (default)
  return (
    <li ref={ref} className={clsx('relative flex gap-4', animClass)}>
      {/* Line + Node */}
      <div className="relative flex flex-col items-center">
        <div
          className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white"
          style={{ borderColor: nodeColor }}
        >
          {IconComponent ? (
            <IconComponent size={14} style={{ color: nodeColor }} />
          ) : (
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: nodeColor }}
            />
          )}
        </div>
        {!isLast && (
          <div
            className="w-0.5 flex-1"
            style={{ backgroundColor: lineColor }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8 pt-0.5 flex-1">
        {showDates && item.date && (
          <span className="mb-1 block text-xs font-medium text-gray-400">
            {item.date}
          </span>
        )}
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="mb-2 h-20 w-32 rounded-lg object-cover"
            loading="lazy"
          />
        )}
        <h4 className="text-base font-semibold text-gray-900">{item.title}</h4>
        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
          {item.description}
        </p>
      </div>
    </li>
  );
};

export const Timeline: React.FC<TimelineProps> = ({
  items = [],
  layout = 'vertical',
  lineColor = '#e5e7eb',
  nodeColor = '#3b82f6',
  showDates = true,
  animated = true,
  className,
}) => {
  if (items.length === 0) {
    return (
      <div className={clsx('py-8 text-center text-gray-400', className)}>
        No timeline items.
      </div>
    );
  }

  return (
    <ol
      className={clsx(
        'list-none p-0 m-0',
        layout === 'horizontal' ? 'flex overflow-x-auto' : 'flex flex-col',
        className,
      )}
    >
      {items.map((item, index) => (
        <TimelineEntry
          key={index}
          item={item}
          index={index}
          total={items.length}
          layout={layout}
          lineColor={lineColor}
          nodeColor={nodeColor}
          showDates={showDates}
          animated={animated}
        />
      ))}
    </ol>
  );
};
