'use client';

import React, { useState } from 'react';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';

interface MediaFieldProps {
  value: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** MIME type prefix filter, e.g. "image" or "video" */
  mimeTypeFilter?: string;
}

export const MediaField: React.FC<MediaFieldProps> = ({
  value,
  onChange,
  placeholder = 'URL or browse media...',
  mimeTypeFilter,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          title="Browse media library"
        >
          &#x1F4C1;
        </button>
      </div>

      {/* Preview current value */}
      {value && mimeTypeFilter === 'image' && (
        <div className="mt-1.5 overflow-hidden rounded border border-gray-100">
          <img
            src={value}
            alt="Preview"
            className="h-20 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <MediaLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setModalOpen(false);
        }}
        mimeTypeFilter={mimeTypeFilter}
      />
    </>
  );
};
