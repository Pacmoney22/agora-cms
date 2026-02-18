'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/lib/api-client';

interface MediaPickerProps {
  value: string;
  onChange: (url: string, meta?: { id: string; originalName: string; mimeType: string; size: number }) => void;
  label: string;
  accept?: string;
  helpText?: string;
  /** Filter media library by MIME type prefix (e.g. 'image', 'application/pdf'). Empty string = all types. Default: 'image' */
  mimeTypeFilter?: string;
}

const CONTENT_API = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:3001';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function MediaPicker({
  value,
  onChange,
  label,
  accept = 'image/*',
  helpText,
  mimeTypeFilter = 'image',
}: MediaPickerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [libraryPage, setLibraryPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-picker', { page: libraryPage, mimeType: mimeTypeFilter || undefined }],
    queryFn: () => mediaApi.list({ page: libraryPage, limit: 12, ...(mimeTypeFilter ? { mimeType: mimeTypeFilter } : {}) }),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['media-picker'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      // Use the presigned URL endpoint to get a usable URL
      const mediaUrl = `${CONTENT_API}/api/v1/media/${result.id}/url`;
      // For simplicity, store the media endpoint path — the storefront can resolve this
      onChange(`/api/v1/media/${result.id}/url`);
      setOpen(false);
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectFromLibrary = (item: any) => {
    onChange(`/api/v1/media/${item.id}/url`, {
      id: item.id,
      originalName: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
    });
    setOpen(false);
  };

  const isImage = value && !value.includes('.ico');

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>

      {/* Current value display */}
      <div className="flex items-start gap-3">
        {/* Preview thumbnail */}
        <div className="h-16 w-16 shrink-0 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {value ? (
            isImage ? (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <span className="text-[10px] text-gray-400 text-center px-1 break-all line-clamp-3">
                  {value.split('/').pop()}
                </span>
              </div>
            ) : (
              <span className="text-lg text-gray-400">{'\uD83D\uDCC4'}</span>
            )
          ) : (
            <span className="text-xs text-gray-300">None</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* URL input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter URL or select from media library"
          />
          {/* Action buttons */}
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Browse Media
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload New'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleUpload}
            className="hidden"
          />
          {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
        </div>
      </div>

      {/* Media Library Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Select from Media Library
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {mediaLoading ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  Loading media...
                </div>
              ) : mediaData?.data?.length ? (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {mediaData.data.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => selectFromLibrary(item)}
                      className="group rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all text-left"
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {item.mimeType?.startsWith('image/') ? (
                          <span className="text-[9px] text-gray-400 p-1 text-center break-all line-clamp-3">
                            {item.originalName}
                          </span>
                        ) : (
                          <span className="text-xl text-gray-300">{'\uD83D\uDCC4'}</span>
                        )}
                      </div>
                      <div className="px-1.5 py-1">
                        <p className="truncate text-[10px] font-medium text-gray-700">
                          {item.originalName}
                        </p>
                        <p className="text-[9px] text-gray-400">
                          {formatBytes(item.size)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400">No files in media library</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                  >
                    Upload a File
                  </button>
                </div>
              )}

              {/* Pagination */}
              {mediaData?.meta && mediaData.meta.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    Page {mediaData.meta.page} of {mediaData.meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                      disabled={libraryPage <= 1}
                      className="rounded bg-gray-100 px-2 py-1 text-[10px] disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setLibraryPage((p) => p + 1)}
                      disabled={libraryPage >= mediaData.meta.totalPages}
                      className="rounded bg-gray-100 px-2 py-1 text-[10px] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
