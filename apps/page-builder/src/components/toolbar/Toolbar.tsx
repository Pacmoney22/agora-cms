'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useBuilderStore, type ResponsiveMode } from '@/stores/builder-store';
import { useHistoryStore } from '@/stores/history-store';

interface ToolbarProps {
  onSave?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  onSaveAsTemplate?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  pageStatus?: string;
  pageTitle?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSave, onPreview, onPublish, onSaveAsTemplate, isSaving, isPublishing, pageStatus, pageTitle }) => {
  const { responsiveMode, setResponsiveMode, isDirty, isPreviewMode } = useBuilderStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();

  const devices: { mode: ResponsiveMode; label: string; symbol: string; width: string }[] = [
    { mode: 'desktop', label: 'Desktop', symbol: '\u{1F5A5}', width: '100%' },
    { mode: 'tablet', label: 'Tablet', symbol: '\u{1F4F1}', width: '768px' },
    { mode: 'mobile', label: 'Mobile', symbol: '\u{1F4F1}', width: '375px' },
  ];

  if (isPreviewMode) {
    return (
      <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900">Preview</h1>
        </div>

        <div className="flex items-center gap-1 rounded-md bg-gray-100 p-0.5">
          {devices.map(({ mode, label, symbol }) => (
            <button
              key={mode}
              onClick={() => setResponsiveMode(mode)}
              className={clsx(
                'rounded px-2 py-1 text-xs transition-colors',
                responsiveMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
              title={label}
            >
              {symbol}
            </button>
          ))}
        </div>

        <button
          onClick={onPreview}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900 transition-colors"
        >
          Exit Preview
        </button>
      </header>
    );
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Title + Status */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">
          {pageTitle || 'Page Builder'}
        </h1>
        {pageStatus === 'published' && !isDirty && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            Published
          </span>
        )}
        {pageStatus === 'draft' && !isDirty && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            Draft
          </span>
        )}
        {isDirty && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Unsaved
          </span>
        )}
      </div>

      {/* Center: Undo/Redo + Device Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => undo()}
            disabled={!canUndo()}
            className={clsx(
              'rounded px-2 py-1 text-sm transition-colors',
              canUndo()
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed',
            )}
            title="Undo (Ctrl+Z)"
          >
            &#x21B6;
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo()}
            className={clsx(
              'rounded px-2 py-1 text-sm transition-colors',
              canRedo()
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed',
            )}
            title="Redo (Ctrl+Shift+Z)"
          >
            &#x21B7;
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-1 rounded-md bg-gray-100 p-0.5">
          {devices.map(({ mode, label, symbol }) => (
            <button
              key={mode}
              onClick={() => setResponsiveMode(mode)}
              className={clsx(
                'rounded px-2 py-1 text-xs transition-colors',
                responsiveMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
              title={label}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Preview
        </button>
        {onSaveAsTemplate && (
          <button
            onClick={onSaveAsTemplate}
            className="rounded-md bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 transition-colors"
            title="Save current page as a reusable template"
          >
            Save as Template
          </button>
        )}
        <button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className={clsx(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            isDirty && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-blue-300 text-blue-100 cursor-not-allowed',
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onPublish}
          disabled={isPublishing}
          className={clsx(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            isPublishing
              ? 'bg-green-400 text-green-100 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700',
          )}
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </header>
  );
};
