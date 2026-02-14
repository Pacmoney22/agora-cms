import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { List } from 'lucide-react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface TableOfContentsProps {
  headingLevels?: Array<'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
  style?: 'sidebar' | 'inline' | 'floating';
  showNumbers?: boolean;
  scrollspy?: boolean;
  smoothScroll?: boolean;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const depthIndentMap: Record<number, string> = {
  2: 'pl-0',
  3: 'pl-4',
  4: 'pl-8',
  5: 'pl-12',
  6: 'pl-16',
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  headingLevels = ['h2', 'h3'],
  style = 'sidebar',
  showNumbers = false,
  scrollspy = true,
  smoothScroll = true,
  title = 'Table of Contents',
  children,
  className,
}) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scan the page for heading elements
  useEffect(() => {
    const selector = headingLevels.join(', ');
    const elements = document.querySelectorAll(selector);

    const items: TocItem[] = Array.from(elements).map((el) => {
      // Ensure each heading has an ID for anchor linking
      if (!el.id) {
        el.id = el.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || '';
      }

      return {
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName.charAt(1), 10),
      };
    });

    setHeadings(items);
  }, [headingLevels]);

  // Scrollspy using IntersectionObserver
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    // Find the first heading that is currently intersecting
    const visibleEntries = entries.filter((entry) => entry.isIntersecting);
    if (visibleEntries.length > 0) {
      setActiveId(visibleEntries[0]!.target.id);
    }
  }, []);

  useEffect(() => {
    if (!scrollspy || headings.length === 0) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: '-80px 0px -80% 0px',
      threshold: 0,
    });

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) {
        observerRef.current?.observe(el);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [scrollspy, headings, handleIntersection]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (smoothScroll) {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without jumping
        window.history.pushState(null, '', `#${id}`);
        setActiveId(id);
      }
    }
  };

  if (headings.length === 0) {
    return null;
  }

  const styleClasses = {
    sidebar: 'w-64 border-l border-gray-200 pl-4',
    inline: 'w-full rounded-lg border border-gray-200 bg-gray-50 p-4',
    floating: 'fixed right-6 top-24 z-30 w-56 rounded-lg border border-gray-200 bg-white p-4 shadow-lg',
  };

  return (
    <nav
      aria-label="Table of contents"
      className={clsx(styleClasses[style], className)}
    >
      {/* Title */}
      <div className="mb-3 flex items-center gap-2">
        <List className="h-4 w-4 text-gray-500" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>

      {/* TOC Items */}
      <ul className="space-y-1">
        {headings.map((heading, index) => (
          <li
            key={heading.id}
            className={depthIndentMap[heading.level] || 'pl-0'}
          >
            <a
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className={clsx(
                'block rounded px-2 py-1 text-sm transition-colors',
                activeId === heading.id
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
              aria-current={activeId === heading.id ? 'true' : undefined}
            >
              {showNumbers && (
                <span className="mr-2 text-gray-400">{index + 1}.</span>
              )}
              {heading.text}
            </a>
          </li>
        ))}
      </ul>

      {children}
    </nav>
  );
};
