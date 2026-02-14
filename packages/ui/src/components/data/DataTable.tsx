import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataTableColumn {
  header: string;
  key: string;
  width?: string;
  alignment?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps {
  columns?: DataTableColumn[];
  rows?: Record<string, React.ReactNode>[];
  dataSource?: 'manual' | 'csv' | 'api';
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  paginated?: boolean;
  rowsPerPage?: number;
  caption?: string | null;
  responsive?: 'scroll' | 'stack' | 'collapse';
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string | null;
  direction: SortDirection;
}

const alignmentMap: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const DataTable: React.FC<DataTableProps> = ({
  columns = [],
  rows = [],
  dataSource = 'manual',
  striped = false,
  bordered = false,
  hoverable = true,
  sortable = false,
  searchable = false,
  paginated = false,
  rowsPerPage = 10,
  caption = null,
  responsive = 'scroll',
  className,
}) => {
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (columnKey: string) => {
    setSortState((prev) => {
      if (prev.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }
      return { key: null, direction: null };
    });
    setCurrentPage(1);
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        return value !== null && value !== undefined && String(value).toLowerCase().includes(query);
      }),
    );
  }, [rows, columns, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortState.key || !sortState.direction) return filteredRows;
    const key = sortState.key;
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [filteredRows, sortState]);

  const totalPages = paginated ? Math.max(1, Math.ceil(sortedRows.length / rowsPerPage)) : 1;
  const paginatedRows = paginated
    ? sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    : sortedRows;

  const getSortIcon = (columnKey: string) => {
    if (sortState.key !== columnKey) {
      return <ArrowUpDown className="ml-1 inline-block h-3.5 w-3.5 opacity-40" />;
    }
    if (sortState.direction === 'asc') {
      return <ArrowUp className="ml-1 inline-block h-3.5 w-3.5" />;
    }
    return <ArrowDown className="ml-1 inline-block h-3.5 w-3.5" />;
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((page, i) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">
            ...
          </span>
        );
      }
      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page as number)}
          className={clsx(
            'rounded px-3 py-1 text-sm transition-colors',
            currentPage === page
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100',
          )}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className={clsx('w-full', className)}>
      {searchable && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search table..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-label="Search table"
            />
          </div>
          {searchQuery && (
            <span className="text-sm text-gray-500">
              {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      <div
        className={clsx(
          responsive === 'scroll' && 'overflow-x-auto',
          bordered && 'rounded-lg border border-gray-200',
        )}
      >
        <table
          className={clsx(
            'w-full border-collapse text-sm',
            responsive === 'stack' && 'block md:table',
          )}
        >
          {caption && (
            <caption className="mb-2 text-left text-sm font-medium text-gray-600">
              {caption}
            </caption>
          )}
          <thead
            className={clsx(
              'bg-gray-50 text-gray-700',
              responsive === 'stack' && 'hidden md:table-header-group',
            )}
          >
            <tr>
              {columns.map((col) => {
                const isColumnSortable = sortable && (col.sortable !== false);
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
                      alignmentMap[col.alignment || 'left'],
                      bordered && 'border-b border-gray-200',
                      isColumnSortable && 'cursor-pointer select-none hover:bg-gray-100',
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={isColumnSortable ? () => handleSort(col.key) : undefined}
                    aria-sort={
                      sortState.key === col.key && sortState.direction
                        ? sortState.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {isColumnSortable && getSortIcon(col.key)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  {searchQuery ? 'No results found.' : 'No data available.'}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={clsx(
                    responsive === 'stack' && 'block border-b border-gray-200 py-2 md:table-row md:border-0 md:py-0',
                    striped && rowIndex % 2 === 1 && 'bg-gray-50',
                    hoverable && 'transition-colors hover:bg-blue-50/50',
                    bordered && 'border-b border-gray-200',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3',
                        alignmentMap[col.alignment || 'left'],
                        responsive === 'stack' && 'block before:font-semibold before:text-gray-500 md:table-cell md:before:content-none',
                        bordered && 'border-b border-gray-100',
                      )}
                      data-label={col.header}
                      style={
                        responsive === 'stack'
                          ? { ['--tw-before-content' as string]: `"${col.header}: "` }
                          : undefined
                      }
                    >
                      {responsive === 'stack' && (
                        <span className="mr-2 font-semibold text-gray-500 md:hidden">
                          {col.header}:{' '}
                        </span>
                      )}
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {(currentPage - 1) * rowsPerPage + 1}–
            {Math.min(currentPage * rowsPerPage, sortedRows.length)} of{' '}
            {sortedRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
