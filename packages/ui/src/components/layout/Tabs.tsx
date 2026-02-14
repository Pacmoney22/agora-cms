import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs?: TabItem[];
  defaultActiveTab?: number;
  tabStyle?: 'underline' | 'boxed' | 'pill' | 'vertical';
  tabAlignment?: 'left' | 'center' | 'stretch';
  accentColor?: string;
  animateTransition?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const alignmentMap = {
  left: 'justify-start',
  center: 'justify-center',
  stretch: 'justify-stretch',
};

export const Tabs: React.FC<TabsProps> = ({
  tabs = [],
  defaultActiveTab = 0,
  tabStyle = 'underline',
  tabAlignment = 'left',
  accentColor,
  animateTransition = true,
  children,
  className,
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const tabListRef = useRef<HTMLDivElement>(null);
  const childrenArray = React.Children.toArray(children);

  useEffect(() => {
    setActiveTab(defaultActiveTab);
  }, [defaultActiveTab]);

  const isVertical = tabStyle === 'vertical';

  const getTabClasses = (index: number) => {
    const isActive = index === activeTab;

    const base = 'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

    const styleClasses = {
      underline: clsx(
        'border-b-2',
        isActive ? 'border-current text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      ),
      boxed: clsx(
        'border rounded-t-md',
        isActive ? 'border-gray-300 border-b-white bg-white text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700',
      ),
      pill: clsx(
        'rounded-full',
        isActive ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
      ),
      vertical: clsx(
        'w-full text-left border-l-2',
        isActive ? 'border-current text-gray-900 bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50',
      ),
    };

    return clsx(
      base,
      styleClasses[tabStyle],
      tabAlignment === 'stretch' && !isVertical && 'flex-1 justify-center',
    );
  };

  const getTabListClasses = () => {
    if (isVertical) {
      return 'flex flex-col border-r border-gray-200 min-w-[180px]';
    }

    return clsx(
      'flex overflow-x-auto scrollbar-hide',
      alignmentMap[tabAlignment],
      tabStyle === 'underline' && 'border-b border-gray-200',
      tabStyle === 'boxed' && 'border-b border-gray-300',
      tabStyle === 'pill' && 'gap-1 rounded-full bg-gray-100 p-1',
    );
  };

  return (
    <div
      className={clsx(
        isVertical ? 'flex flex-col md:flex-row' : 'w-full',
        className,
      )}
    >
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        className={getTabListClasses()}
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            id={`tab-${index}`}
            aria-selected={index === activeTab}
            aria-controls={`tabpanel-${index}`}
            tabIndex={index === activeTab ? 0 : -1}
            className={getTabClasses(index)}
            style={
              index === activeTab && accentColor
                ? tabStyle === 'pill'
                  ? { backgroundColor: accentColor, color: '#fff' }
                  : { color: accentColor }
                : undefined
            }
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => {
              const isHorizontal = !isVertical;
              const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
              const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

              if (e.key === nextKey) {
                e.preventDefault();
                const next = (index + 1) % tabs.length;
                setActiveTab(next);
                (tabListRef.current?.querySelector(`#tab-${next}`) as HTMLElement)?.focus();
              } else if (e.key === prevKey) {
                e.preventDefault();
                const prev = (index - 1 + tabs.length) % tabs.length;
                setActiveTab(prev);
                (tabListRef.current?.querySelector(`#tab-${prev}`) as HTMLElement)?.focus();
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActiveTab(0);
                (tabListRef.current?.querySelector('#tab-0') as HTMLElement)?.focus();
              } else if (e.key === 'End') {
                e.preventDefault();
                const last = tabs.length - 1;
                setActiveTab(last);
                (tabListRef.current?.querySelector(`#tab-${last}`) as HTMLElement)?.focus();
              }
            }}
          >
            {tab.icon && <span className="h-4 w-4">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={clsx('flex-1', isVertical ? 'pl-6' : 'pt-4')}>
        {childrenArray.map((child, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            hidden={index !== activeTab}
            className={clsx(
              animateTransition && index === activeTab && 'animate-fade-in',
            )}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};
