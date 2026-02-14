import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface MegaMenuLink {
  label: string;
  url: string;
  description?: string;
  icon?: string;
}

export interface MegaMenuColumn {
  heading: string;
  links: MegaMenuLink[];
}

export interface MegaMenuFeaturedContent {
  image: string;
  heading: string;
  description?: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface MegaMenuProps {
  columns?: MegaMenuColumn[];
  featuredContent?: MegaMenuFeaturedContent | null;
  showFeatured?: boolean;
  maxWidth?: 'container' | 'full';
  animation?: 'fade' | 'slide-down' | 'none';
  triggerLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const animationClassMap = {
  fade: {
    base: 'opacity-0 transition-opacity duration-200 ease-in-out',
    open: 'opacity-100',
  },
  'slide-down': {
    base: 'opacity-0 -translate-y-2 transition-all duration-200 ease-in-out',
    open: 'opacity-100 translate-y-0',
  },
  none: {
    base: '',
    open: '',
  },
};

export const MegaMenu: React.FC<MegaMenuProps> = ({
  columns = [],
  featuredContent = null,
  showFeatured = true,
  maxWidth = 'container',
  animation = 'fade',
  triggerLabel = 'Menu',
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const animConfig = animationClassMap[animation];

  return (
    <div
      ref={menuRef}
      className={clsx('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100"
      >
        {triggerLabel}
        <ChevronDown
          className={clsx(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={clsx(
            'absolute left-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl',
            maxWidth === 'container' ? 'w-[800px] max-w-[90vw]' : 'left-0 right-0 w-screen',
            animConfig.base,
            isOpen && animConfig.open,
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="flex">
            {/* Navigation Columns */}
            <div
              className={clsx(
                'grid flex-1 gap-6 p-6',
                columns.length === 1 && 'grid-cols-1',
                columns.length === 2 && 'grid-cols-2',
                columns.length >= 3 && 'grid-cols-3',
              )}
            >
              {columns.map((column) => (
                <div key={column.heading}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {column.heading}
                  </h3>
                  <ul className="space-y-1">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.url}
                          className="group block rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
                          role="menuitem"
                        >
                          <div className="flex items-start gap-3">
                            {link.icon && (
                              <span
                                className="mt-0.5 text-gray-400 group-hover:text-blue-600"
                                aria-hidden="true"
                              >
                                {link.icon}
                              </span>
                            )}
                            <div>
                              <span className="block text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                {link.label}
                              </span>
                              {link.description && (
                                <span className="mt-0.5 block text-xs text-gray-500">
                                  {link.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Featured Content Panel */}
            {showFeatured && featuredContent && (
              <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50 p-6">
                {featuredContent.image && (
                  <img
                    src={featuredContent.image}
                    alt={featuredContent.heading}
                    className="mb-4 h-36 w-full rounded-md object-cover"
                  />
                )}
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  {featuredContent.heading}
                </h4>
                {featuredContent.description && (
                  <p className="mb-4 text-xs text-gray-600">
                    {featuredContent.description}
                  </p>
                )}
                <a
                  href={featuredContent.ctaUrl}
                  className="inline-block rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {featuredContent.ctaLabel}
                </a>
              </div>
            )}
          </div>

          {children}
        </div>
      )}
    </div>
  );
};
