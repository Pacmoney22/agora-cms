'use client';

import React, { useState, useMemo, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { clsx } from 'clsx';
import { MediaField } from './MediaField';

// Build a list of icon names from lucide-react exports.
// Filter to only React components (PascalCase, function type, not utilities).
const ICON_NAMES: string[] = (() => {
  const skip = new Set([
    'createLucideIcon', 'icons', 'default', 'Icon',
    // Aliases & internal
    'defaultAttributes',
  ]);
  const names: string[] = [];
  for (const [key, value] of Object.entries(LucideIcons)) {
    if (skip.has(key)) continue;
    // PascalCase check: starts with uppercase, no underscores
    // Lucide icons can be forwardRef objects or functions depending on version
    if (/^[A-Z][a-zA-Z0-9]*$/.test(key) && (typeof value === 'object' || typeof value === 'function')) {
      names.push(key);
    }
  }
  return names.sort();
})();

interface IconFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const IconField: React.FC<IconFieldProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isImageUrl = value && (value.startsWith('http') || value.startsWith('/'));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {/* Preview */}
        {value && !isImageUrl && (
          <IconPreview name={value} size={20} />
        )}
        {value && isImageUrl && (
          <img src={value} alt="" className="h-5 w-5 rounded object-cover" />
        )}
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Icon name or image URL..."
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Browse
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-gray-400 hover:text-red-500 text-sm"
            title="Clear"
          >
            &#x2715;
          </button>
        )}
      </div>
      {isOpen && (
        <IconPickerModal
          currentValue={value}
          onSelect={(v) => { onChange(v); setIsOpen(false); }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

const IconPreview: React.FC<{ name: string; size?: number }> = ({ name, size = 16 }) => {
  const icons = LucideIcons as Record<string, unknown>;
  const Comp = icons[name];
  if (!Comp || (typeof Comp !== 'object' && typeof Comp !== 'function')) return null;
  const Icon = Comp as React.FC<{ className?: string; style?: React.CSSProperties }>;
  return <Icon className="text-gray-600" style={{ width: size, height: size }} />;
};

// --- Icon Picker Modal ---

const ICONS_PER_PAGE = 80;

interface IconPickerModalProps {
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({ currentValue, onSelect, onClose }) => {
  const [tab, setTab] = useState<'icons' | 'image'>('icons');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICON_NAMES;
    const q = search.toLowerCase();
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const totalPages = Math.ceil(filteredIcons.length / ICONS_PER_PAGE);
  const pageIcons = filteredIcons.slice(page * ICONS_PER_PAGE, (page + 1) * ICONS_PER_PAGE);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 z-50 mx-auto flex max-h-[80vh] max-w-lg flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Select Icon</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&#x2715;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('icons')}
            className={clsx(
              'flex-1 py-2 text-xs font-medium',
              tab === 'icons' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Lucide Icons ({filteredIcons.length})
          </button>
          <button
            onClick={() => setTab('image')}
            className={clsx(
              'flex-1 py-2 text-xs font-medium',
              tab === 'image' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Custom Image
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'icons' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search icons..."
                value={search}
                onChange={handleSearchChange}
                autoFocus
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />

              {pageIcons.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No icons match &quot;{search}&quot;</div>
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {pageIcons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => onSelect(name)}
                      className={clsx(
                        'flex flex-col items-center justify-center rounded-lg p-2 transition-colors',
                        currentValue === name
                          ? 'bg-blue-100 ring-2 ring-blue-400'
                          : 'hover:bg-gray-100',
                      )}
                    >
                      <IconPreview name={name} size={20} />
                    </button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-400">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'image' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Use a custom image as an icon. Upload or select from the media library.
              </p>
              <MediaField
                value={currentValue?.startsWith('http') || currentValue?.startsWith('/') ? currentValue : ''}
                onChange={(url) => onSelect(url ?? '')}
                placeholder="Image URL..."
                mimeTypeFilter="image"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
