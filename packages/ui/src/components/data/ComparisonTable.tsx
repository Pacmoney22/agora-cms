import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Check, X, Info } from 'lucide-react';

export interface ComparisonColumn {
  heading: string;
  subheading?: string;
  image?: string;
  highlighted?: boolean;
}

export interface ComparisonRow {
  feature: string;
  values: (string | boolean | number)[];
  tooltip?: string;
}

export interface ComparisonTableProps {
  columns?: ComparisonColumn[];
  rows?: ComparisonRow[];
  showHeader?: boolean;
  stickyHeader?: boolean;
  highlightDifferences?: boolean;
  showCta?: boolean;
  ctaLabels?: string[];
  className?: string;
}

const renderCellValue = (value: string | boolean | number) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto h-5 w-5 text-green-500" aria-label="Yes" />
    ) : (
      <X className="mx-auto h-5 w-5 text-gray-300" aria-label="No" />
    );
  }
  if (typeof value === 'number') {
    return <span className="font-medium tabular-nums">{value}</span>;
  }
  return <span>{value}</span>;
};

const TooltipWrapper: React.FC<{
  tooltip?: string;
  children: React.ReactNode;
}> = ({ tooltip, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!tooltip) return <>{children}</>;

  return (
    <span
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      <button
        className="inline-flex text-gray-400 hover:text-gray-600"
        aria-label={tooltip}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          role="tooltip"
        >
          {tooltip}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  columns = [],
  rows = [],
  showHeader = true,
  stickyHeader = false,
  highlightDifferences = false,
  showCta = false,
  ctaLabels = [],
  className,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (!stickyHeader) return;

    const handleScroll = () => {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        setIsStuck(rect.top < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [stickyHeader]);

  const hasHighlight = columns.some((col) => col.highlighted);

  const rowHasDifferences = (row: ComparisonRow): boolean => {
    if (!highlightDifferences || row.values.length <= 1) return false;
    const stringified = row.values.map((v) => JSON.stringify(v));
    return new Set(stringified).size > 1;
  };

  return (
    <div
      ref={tableRef}
      className={clsx('w-full overflow-x-auto', className)}
    >
      <table className="w-full border-collapse text-sm">
        {showHeader && (
          <thead>
            <tr
              className={clsx(
                stickyHeader && 'sticky top-0 z-10',
                isStuck && 'shadow-md',
              )}
            >
              {/* Empty corner cell for feature column */}
              <th
                className={clsx(
                  'sticky left-0 z-20 bg-white px-4 py-3 text-left',
                  stickyHeader && 'bg-white',
                )}
              />
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={clsx(
                    'px-6 py-4 text-center',
                    col.highlighted
                      ? 'bg-blue-50 border-x-2 border-t-2 border-blue-200'
                      : 'bg-gray-50',
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    {col.image && (
                      <img
                        src={col.image}
                        alt=""
                        className="h-10 w-10 rounded-lg object-contain"
                        loading="lazy"
                      />
                    )}
                    <span
                      className={clsx(
                        'text-base font-semibold',
                        col.highlighted ? 'text-blue-700' : 'text-gray-900',
                      )}
                    >
                      {col.heading}
                    </span>
                    {col.subheading && (
                      <span className="text-xs font-normal text-gray-500">
                        {col.subheading}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => {
            const isDifferent = rowHasDifferences(row);

            return (
              <tr
                key={rowIndex}
                className={clsx(
                  'border-b border-gray-100',
                  isDifferent && 'bg-amber-50/40',
                )}
              >
                <td
                  className={clsx(
                    'sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-700',
                    isDifferent && 'bg-amber-50/40',
                  )}
                >
                  <TooltipWrapper tooltip={row.tooltip}>
                    {row.feature}
                  </TooltipWrapper>
                </td>
                {row.values.map((value, colIndex) => {
                  const col = columns[colIndex];
                  const isHighlightedCol = col?.highlighted;

                  return (
                    <td
                      key={colIndex}
                      className={clsx(
                        'px-6 py-3 text-center text-gray-600',
                        isHighlightedCol && 'bg-blue-50/50 border-x-2 border-blue-200',
                      )}
                    >
                      {renderCellValue(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

        {showCta && ctaLabels.length > 0 && (
          <tfoot>
            <tr>
              <td className="sticky left-0 bg-white px-4 py-4" />
              {columns.map((col, i) => (
                <td
                  key={i}
                  className={clsx(
                    'px-6 py-4 text-center',
                    col.highlighted && 'bg-blue-50/50 border-x-2 border-b-2 border-blue-200',
                  )}
                >
                  {ctaLabels[i] && (
                    <button
                      className={clsx(
                        'rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                        col.highlighted
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      {ctaLabels[i]}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
