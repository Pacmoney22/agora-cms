import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  label: string;
  icon?: string;
  image?: string;
  description?: string;
}

export interface AnimatedTabsProps {
  tabs?: TabItem[];
  layout?: 'horizontal' | 'vertical-left' | 'vertical-right';
  contentAnimation?: 'fade-up' | 'fade' | 'slide-left' | 'zoom';
  autoRotate?: boolean;
  rotateInterval?: number;
  mediaPosition?: 'right' | 'left' | 'top' | 'bottom';
  children?: React.ReactNode;
  className?: string;
}

const animationClasses: Record<string, { enter: string; active: string }> = {
  'fade-up': {
    enter: 'translate-y-4 opacity-0',
    active: 'translate-y-0 opacity-100',
  },
  fade: {
    enter: 'opacity-0',
    active: 'opacity-100',
  },
  'slide-left': {
    enter: 'translate-x-8 opacity-0',
    active: 'translate-x-0 opacity-100',
  },
  zoom: {
    enter: 'scale-95 opacity-0',
    active: 'scale-100 opacity-100',
  },
};

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs = [],
  layout = 'horizontal',
  contentAnimation = 'fade-up',
  autoRotate = false,
  rotateInterval = 5000,
  mediaPosition = 'right',
  children,
  className,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRotate && tabs.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % tabs.length);
      }, rotateInterval);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoRotate, rotateInterval, tabs.length]);

  const handleTabClick = (index: number) => {
    if (index === activeIndex) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsAnimating(true);
    setTimeout(() => {
      setActiveIndex(index);
      setIsAnimating(false);
    }, 150);

    if (autoRotate && tabs.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % tabs.length);
      }, rotateInterval);
    }
  };

  const animation = animationClasses[contentAnimation] ?? animationClasses['fade-up']!;
  const isVertical = layout === 'vertical-left' || layout === 'vertical-right';

  const childrenArray = React.Children.toArray(children);
  const activeChild = childrenArray[activeIndex] || null;
  const activeTab = tabs[activeIndex];

  const TabList = () => (
    <div
      role="tablist"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={clsx(
        'flex',
        isVertical ? 'flex-col gap-1' : 'gap-1 border-b border-gray-200',
      )}
    >
      {tabs.map((tab, index) => (
        <button
          key={index}
          role="tab"
          aria-selected={activeIndex === index}
          aria-controls={`tabpanel-${index}`}
          id={`tab-${index}`}
          onClick={() => handleTabClick(index)}
          className={clsx(
            'relative px-4 py-3 text-left text-sm font-medium transition-colors',
            isVertical && 'rounded-lg',
            !isVertical && '-mb-px',
            activeIndex === index
              ? isVertical
                ? 'bg-blue-50 text-blue-600'
                : 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <span className="flex items-center gap-2">
            {tab.icon && (
              <img src={tab.icon} alt="" className="h-5 w-5" aria-hidden="true" />
            )}
            {tab.label}
          </span>
          {isVertical && tab.description && (
            <span className="mt-0.5 block text-xs text-gray-400">{tab.description}</span>
          )}
        </button>
      ))}
    </div>
  );

  const ContentPanel = () => (
    <div
      role="tabpanel"
      id={`tabpanel-${activeIndex}`}
      aria-labelledby={`tab-${activeIndex}`}
      className={clsx(
        'transition-all duration-300',
        isAnimating ? animation.enter : animation.active,
      )}
    >
      {activeTab?.image && (
        <img
          src={activeTab.image}
          alt={activeTab.label}
          className="mb-4 w-full rounded-lg object-cover"
        />
      )}
      {activeTab?.description && !isVertical && (
        <p className="mb-4 text-gray-600">{activeTab.description}</p>
      )}
      {activeChild}
    </div>
  );

  if (isVertical) {
    return (
      <div
        className={clsx(
          'flex gap-6',
          layout === 'vertical-right' && 'flex-row-reverse',
          className,
        )}
      >
        <div className="w-64 flex-shrink-0">
          <TabList />
        </div>
        <div className="flex-1">
          <ContentPanel />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      <TabList />
      <div className="mt-4">
        <ContentPanel />
      </div>
    </div>
  );
};
