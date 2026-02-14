import React from 'react';
import { clsx } from 'clsx';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  source?: 'auto' | 'manual';
  separator?: 'chevron' | 'slash' | 'arrow' | 'dot';
  showHome?: boolean;
  showCurrent?: boolean;
  maxItems?: number | null;
  children?: React.ReactNode;
  className?: string;
}

const separatorMap = {
  chevron: ChevronRight,
  slash: null,
  arrow: null,
  dot: null,
};

const separatorCharMap: Record<string, string> = {
  slash: '/',
  arrow: '\u203A',
  dot: '\u00B7',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items = [],
  source = 'manual',
  separator = 'chevron',
  showHome = true,
  showCurrent = true,
  maxItems = null,
  children,
  className,
}) => {
  // Build the full items list including home
  const allItems: BreadcrumbItem[] = [];
  if (showHome) {
    allItems.push({ label: 'Home', url: '/' });
  }
  allItems.push(...items);

  // Apply truncation if maxItems is set and items exceed it
  let displayItems = allItems;
  let isTruncated = false;

  if (maxItems && maxItems > 0 && allItems.length > maxItems) {
    isTruncated = true;
    const firstItem = allItems[0]!;
    const lastItems = allItems.slice(-(maxItems - 1));
    displayItems = [firstItem, ...lastItems];
  }

  // Remove the last item if showCurrent is false
  const lastIndex = displayItems.length - 1;

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.url,
    })),
  };

  const SeparatorIcon = separatorMap[separator];

  const renderSeparator = () => {
    if (SeparatorIcon) {
      return (
        <SeparatorIcon
          className="mx-2 h-4 w-4 flex-shrink-0 text-gray-400"
          aria-hidden="true"
        />
      );
    }
    return (
      <span className="mx-2 text-gray-400" aria-hidden="true">
        {separatorCharMap[separator] || '/'}
      </span>
    );
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className={clsx('w-full', className)}>
        <ol className="flex flex-wrap items-center text-sm">
          {displayItems.map((item, index) => {
            const isLast = index === lastIndex;
            const isFirst = index === 0;
            const showEllipsis = isTruncated && index === 1;

            // Skip last item if showCurrent is false and this is the last item
            if (isLast && !showCurrent) {
              return null;
            }

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {/* Ellipsis for truncation */}
                {showEllipsis && (
                  <>
                    {renderSeparator()}
                    <li className="flex items-center">
                      <span
                        className="text-gray-400"
                        aria-hidden="true"
                      >
                        ...
                      </span>
                    </li>
                  </>
                )}

                {/* Separator (not before the first item) */}
                {!isFirst && (
                  <>
                    {renderSeparator()}
                  </>
                )}

                {/* Breadcrumb Item */}
                <li className="flex items-center">
                  {isLast ? (
                    <span
                      className="font-medium text-gray-900"
                      aria-current="page"
                    >
                      {isFirst && showHome ? (
                        <span className="flex items-center gap-1">
                          <Home className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{item.label}</span>
                        </span>
                      ) : (
                        item.label
                      )}
                    </span>
                  ) : (
                    <a
                      href={item.url}
                      className="text-gray-500 transition-colors hover:text-gray-700"
                    >
                      {isFirst && showHome ? (
                        <span className="flex items-center gap-1">
                          <Home className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{item.label}</span>
                        </span>
                      ) : (
                        item.label
                      )}
                    </a>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
        {children}
      </nav>
    </>
  );
};
