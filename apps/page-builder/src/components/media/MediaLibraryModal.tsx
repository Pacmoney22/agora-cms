'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { useMediaLibrary, type MediaItem } from '@/hooks/useMediaLibrary';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item: MediaItem) => void;
  /** Filter to a MIME type prefix, e.g. "image" or "video" */
  mimeTypeFilter?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  mimeTypeFilter,
}) => {
  const { items, meta, loading, uploading, error, fetchMedia, uploadFile } = useMediaLibrary();
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Load media when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMedia(1, mimeTypeFilter);
      setSelectedItem(null);
      setActiveTab('library');
    }
  }, [isOpen, fetchMedia, mimeTypeFilter]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      if (!file) return;
      const uploaded = await uploadFile(file);
      if (uploaded) {
        onSelect(uploaded.url, uploaded);
        onClose();
      }
    },
    [uploadFile, onSelect, onClose],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleSelectFromLibrary = () => {
    if (selectedItem) {
      onSelect(selectedItem.url, selectedItem);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[600px] w-[800px] flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Media Library</h2>
          <button
            onClick={onClose}
            className="text-lg text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('library')}
            className={clsx(
              'border-b-2 px-4 py-2 text-xs font-medium transition-colors',
              activeTab === 'library'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={clsx(
              'border-b-2 px-4 py-2 text-xs font-medium transition-colors',
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          {activeTab === 'upload' ? (
            <UploadTab
              dragOver={dragOver}
              uploading={uploading}
              mimeTypeFilter={mimeTypeFilter}
              fileInputRef={fileInputRef}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onFileSelect={handleFileSelect}
            />
          ) : (
            <LibraryTab
              items={items}
              meta={meta}
              loading={loading}
              selectedItem={selectedItem}
              mimeTypeFilter={mimeTypeFilter}
              onSelect={setSelectedItem}
              onPageChange={(page) => fetchMedia(page, mimeTypeFilter)}
              onSwitchToUpload={() => setActiveTab('upload')}
            />
          )}
        </div>

        {/* Footer (library tab only) */}
        {activeTab === 'library' && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="text-[10px] text-gray-400">
              {selectedItem
                ? `${selectedItem.originalName} (${formatFileSize(selectedItem.size)})`
                : 'No file selected'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectFromLibrary}
                disabled={!selectedItem}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors',
                  selectedItem
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'cursor-not-allowed bg-blue-300',
                )}
              >
                Select
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Upload Tab ────────────────────────────────────────────── */

interface UploadTabProps {
  dragOver: boolean;
  uploading: boolean;
  mimeTypeFilter?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

const UploadTab: React.FC<UploadTabProps> = ({
  dragOver,
  uploading,
  mimeTypeFilter,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => (
  <div
    className={clsx(
      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
      dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
    )}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    {uploading ? (
      <div className="text-sm text-gray-500">Uploading&hellip;</div>
    ) : (
      <>
        <div className="mb-3 text-3xl text-gray-300">&#x2B06;</div>
        <p className="mb-2 text-sm text-gray-500">Drag &amp; drop a file here, or</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={mimeTypeFilter ? `${mimeTypeFilter}/*` : undefined}
          onChange={(e) => onFileSelect(e.target.files)}
        />
        <p className="mt-3 text-[10px] text-gray-400">Max file size: 10 MB</p>
      </>
    )}
  </div>
);

/* ── Library Tab ───────────────────────────────────────────── */

interface LibraryTabProps {
  items: MediaItem[];
  meta: { page: number; totalPages: number };
  loading: boolean;
  selectedItem: MediaItem | null;
  mimeTypeFilter?: string;
  onSelect: (item: MediaItem) => void;
  onPageChange: (page: number) => void;
  onSwitchToUpload: () => void;
}

const LibraryTab: React.FC<LibraryTabProps> = ({
  items,
  meta,
  loading,
  selectedItem,
  onSelect,
  onPageChange,
  onSwitchToUpload,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        Loading&hellip;
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
        <p>No media files found.</p>
        <button
          onClick={onSwitchToUpload}
          className="mt-2 text-xs text-blue-500 hover:text-blue-600"
        >
          Upload one
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={clsx(
              'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
              selectedItem?.id === item.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            {item.mimeType.startsWith('image/') ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.originalName}
                className="h-full w-full object-cover"
              />
            ) : item.mimeType.startsWith('video/') ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 text-gray-400">
                <span className="text-2xl">&#x1F3AC;</span>
                <span className="mt-1 max-w-full truncate px-2 text-[10px]">
                  {item.originalName}
                </span>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 text-gray-400">
                <span className="text-2xl">&#x1F4C4;</span>
                <span className="mt-1 max-w-full truncate px-2 text-[10px]">
                  {item.originalName}
                </span>
              </div>
            )}
            {selectedItem?.id === item.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  &#x2713;
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          >
            &laquo; Prev
          </button>
          <span className="text-xs text-gray-400">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          >
            Next &raquo;
          </button>
        </div>
      )}
    </>
  );
};
