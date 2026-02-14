'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { mediaApi } from '@/lib/api-client';

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [mimeFilter, setMimeFilter] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['media', { page, mimeType: mimeFilter }],
    queryFn: () => mediaApi.list({ page, limit: 24, mimeType: mimeFilter }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('File uploaded');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('File deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        uploadMutation.mutate(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="mt-1 text-sm text-gray-500">Upload and manage media files. Images auto-convert to WebP.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>

      {/* MIME Type Filter */}
      <div className="mb-4 flex gap-2">
        {[
          { label: 'All', value: undefined },
          { label: 'Images', value: 'image' },
          { label: 'Videos', value: 'video' },
          { label: 'Documents', value: 'application' },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() => setMimeFilter(f.value)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              mimeFilter === f.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-gray-400">Loading...</p>
      ) : data?.data?.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {data.data.map((item: any) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {item.mimeType?.startsWith('image/') ? (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                    {item.originalName}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <span className="text-2xl">{item.mimeType?.startsWith('video/') ? '\u25B6' : '\u{1F4C4}'}</span>
                    <span className="text-[10px] truncate max-w-full px-2">{item.originalName}</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-gray-700">{item.originalName}</p>
                <p className="text-[10px] text-gray-400">{formatBytes(item.size)}</p>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { if (confirm(`Delete "${item.originalName}"?`)) deleteMutation.mutate(item.id); }}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No media files yet.</p>
          <p className="mt-1 text-xs text-gray-400">Upload images, videos, or documents to get started.</p>
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {data.meta.page} of {data.meta.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages} className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
