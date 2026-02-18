'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, mediaApi, coursesApi, productsApi } from '@/lib/api-client';

// Gated files are stored as settings key: `gated_files`
// Each file references a media asset but adds gating rules

interface GatedFile {
  id: string;
  name: string;
  description: string;
  mediaId: string;         // references media library asset
  fileName: string;        // display filename
  fileSize: string;
  mimeType: string;
  category: string;
  accessType: 'public' | 'authenticated' | 'purchased' | 'enrolled' | 'form_gated';
  linkedCourseId: string;  // if accessType is 'enrolled'
  linkedProductId: string; // if accessType is 'purchased'
  linkedFormId: string;    // if accessType is 'form_gated'
  downloadCount: number;
  maxDownloads: number;    // 0 = unlimited
  expiresAfterDays: number; // 0 = never
  enabled: boolean;
  createdAt: string;
}

interface GatedFilesStore {
  files: GatedFile[];
}

function genId() {
  return `gf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const DEFAULT_CATEGORIES = [
  { value: 'course_content', label: 'Course Content' },
  { value: 'whitepaper', label: 'Whitepaper' },
  { value: 'downloadable_product', label: 'Downloadable Product' },
  { value: 'resource', label: 'Resource' },
  { value: 'other', label: 'Other' },
];

const ACCESS_TYPES = [
  { value: 'public', label: 'Public', description: 'Anyone can download' },
  { value: 'authenticated', label: 'Authenticated', description: 'Must be logged in' },
  { value: 'purchased', label: 'Purchased', description: 'Must have purchased linked product' },
  { value: 'enrolled', label: 'Enrolled', description: 'Must be enrolled in linked course' },
  { value: 'form_gated', label: 'Form Gated', description: 'Must submit linked form' },
];

const CATEGORY_COLORS: Record<string, string> = {
  course_content: 'bg-purple-100 text-purple-700',
  whitepaper: 'bg-blue-100 text-blue-700',
  downloadable_product: 'bg-green-100 text-green-700',
  resource: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function GatedFilesPage() {
  const queryClient = useQueryClient();
  const [editingFile, setEditingFile] = useState<GatedFile | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [accessFilter, setAccessFilter] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showEditorMediaPicker, setShowEditorMediaPicker] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  const { data: store, isLoading } = useQuery({
    queryKey: ['settings', 'gated_files'],
    queryFn: () => settingsApi.get('gated_files').catch(() => ({ files: [] })),
  });

  // Also load media for file picker
  const { data: mediaData } = useQuery({
    queryKey: ['media', 'gated-picker'],
    queryFn: () => mediaApi.list({ limit: 200 }),
  });

  // Load configurable categories from settings (fallback to defaults)
  const { data: catRegistry } = useQuery({
    queryKey: ['settings', 'gated_files_categories'],
    queryFn: () => settingsApi.get('gated_files_categories').catch(() => null),
  });
  const CATEGORIES: { value: string; label: string }[] = catRegistry?.categories || DEFAULT_CATEGORIES;

  // Load courses, products, and forms for picker dropdowns
  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'picker'],
    queryFn: () => coursesApi.list({ limit: 200 }).catch(() => ({ data: [] })),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products', 'picker'],
    queryFn: () => productsApi.list({ limit: 200 }).catch(() => ({ data: [] })),
  });
  const { data: formsRegistry } = useQuery({
    queryKey: ['settings', 'forms_registry'],
    queryFn: () => settingsApi.get('forms_registry').catch(() => ({ forms: [] })),
  });

  const courseOptions: { id: string; title: string }[] = coursesData?.data || [];
  const productOptions: { id: string; name: string }[] = productsData?.data || [];
  const formOptions: { id: string; name: string }[] = formsRegistry?.forms || [];

  const files: GatedFile[] = store?.files || [];
  const mediaItems = mediaData?.data || [];

  const saveMutation = useMutation({
    mutationFn: async (updatedFiles: GatedFile[]) => {
      await settingsApi.update('gated_files', { files: updatedFiles } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'gated_files'] });
      toast.success('Gated files saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUploadAndCreate = async (file: File) => {
    try {
      setUploadingFile(true);
      const uploaded = await mediaApi.upload(file);
      const gatedFile: GatedFile = {
        id: genId(),
        name: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        mediaId: uploaded.id,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        mimeType: file.type,
        category: 'other',
        accessType: 'authenticated',
        linkedCourseId: '',
        linkedProductId: '',
        linkedFormId: '',
        downloadCount: 0,
        maxDownloads: 0,
        expiresAfterDays: 0,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      const updatedFiles = [...files, gatedFile];
      await saveMutation.mutateAsync(updatedFiles);
      setEditingFile(gatedFile);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const createFromMedia = (media: any) => {
    const gatedFile: GatedFile = {
      id: genId(),
      name: media.originalName?.replace(/\.[^.]+$/, '') || 'Untitled',
      description: '',
      mediaId: media.id,
      fileName: media.originalName || media.filename,
      fileSize: formatBytes(media.size || 0),
      mimeType: media.mimeType || '',
      category: 'other',
      accessType: 'authenticated',
      linkedCourseId: '',
      linkedProductId: '',
      linkedFormId: '',
      downloadCount: 0,
      maxDownloads: 0,
      expiresAfterDays: 0,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updatedFiles = [...files, gatedFile];
    saveMutation.mutate(updatedFiles);
    setEditingFile(gatedFile);
  };

  const updateFile = (id: string, updates: Partial<GatedFile>) => {
    const updatedFiles = files.map((f) => f.id === id ? { ...f, ...updates } : f);
    saveMutation.mutate(updatedFiles);
    if (editingFile?.id === id) {
      setEditingFile({ ...editingFile, ...updates });
    }
  };

  const deleteFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    saveMutation.mutate(updatedFiles);
    if (editingFile?.id === id) setEditingFile(null);
  };

  const filteredFiles = files.filter((f) => {
    if (categoryFilter && f.category !== categoryFilter) return false;
    if (accessFilter && f.accessType !== accessFilter) return false;
    return true;
  });

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const renderMediaPickerModal = (
    isOpen: boolean,
    onClose: () => void,
    onSelect: (media: any) => void,
  ) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select from Media Library</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          {mediaItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No media found. Upload files to the Media Library first.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-1">
              {mediaItems.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-gray-50 border border-transparent hover:border-gray-200"
                >
                  <span className="flex-shrink-0 text-lg">
                    {item.mimeType?.startsWith('image/') ? '\uD83D\uDDBC' : '\uD83D\uDCC4'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.originalName || item.filename}</p>
                    <p className="text-xs text-gray-400">{formatBytes(item.size || 0)} &middot; {item.mimeType || 'unknown'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── File Detail Editor ───
  if (editingFile) {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setEditingFile(null)} className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">{editingFile.name}</h1>
          </div>
          <button
            onClick={() => updateFile(editingFile.id, editingFile)}
            disabled={saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">File Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingFile.name}
                  onChange={(e) => setEditingFile({ ...editingFile, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingFile.description}
                  onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Brief description of this file"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">File</p>
                  <p className="mt-1 text-xs text-gray-700 truncate">{editingFile.fileName}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Size</p>
                  <p className="mt-1 text-xs text-gray-700">{editingFile.fileSize}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Type</p>
                  <p className="mt-1 text-xs text-gray-700">{editingFile.mimeType}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <label className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 cursor-pointer">
                  Replace File
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const uploaded = await mediaApi.upload(file);
                        setEditingFile({
                          ...editingFile,
                          mediaId: uploaded.id,
                          fileName: file.name,
                          fileSize: formatBytes(file.size),
                          mimeType: file.type,
                        });
                      } catch (err: any) {
                        toast.error(err.message || 'Upload failed');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowEditorMediaPicker(true)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Link Different File
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingFile.category}
                  onChange={(e) => setEditingFile({ ...editingFile, category: e.target.value as GatedFile['category'] })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Access Control</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Who can download this file?</label>
                <div className="grid grid-cols-1 gap-2">
                  {ACCESS_TYPES.map((at) => (
                    <button
                      key={at.value}
                      onClick={() => setEditingFile({ ...editingFile, accessType: at.value as GatedFile['accessType'] })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        editingFile.accessType === at.value
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{at.label}</p>
                      <p className="text-xs text-gray-500">{at.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {editingFile.accessType === 'enrolled' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Linked Course</label>
                  <select
                    value={editingFile.linkedCourseId}
                    onChange={(e) => setEditingFile({ ...editingFile, linkedCourseId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a course...</option>
                    {courseOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-400">Only enrolled students can download</p>
                </div>
              )}

              {editingFile.accessType === 'purchased' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Linked Product</label>
                  <select
                    value={editingFile.linkedProductId}
                    onChange={(e) => setEditingFile({ ...editingFile, linkedProductId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a product...</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-400">Only customers who purchased this product can download</p>
                </div>
              )}

              {editingFile.accessType === 'form_gated' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Linked Form</label>
                  <select
                    value={editingFile.linkedFormId}
                    onChange={(e) => setEditingFile({ ...editingFile, linkedFormId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a form...</option>
                    {formOptions.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-400">Users must submit this form to get access</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Download Limits</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Downloads per User</label>
                <input
                  type="number"
                  value={editingFile.maxDownloads}
                  onChange={(e) => setEditingFile({ ...editingFile, maxDownloads: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
                <p className="mt-1 text-[10px] text-gray-400">0 = unlimited</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Link Expires After (days)</label>
                <input
                  type="number"
                  value={editingFile.expiresAfterDays}
                  onChange={(e) => setEditingFile({ ...editingFile, expiresAfterDays: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
                <p className="mt-1 text-[10px] text-gray-400">0 = never expires</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-md bg-gray-50 p-3 flex-1">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Total Downloads</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{editingFile.downloadCount}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingFile.enabled}
                  onChange={(e) => setEditingFile({ ...editingFile, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 h-4 w-4"
                />
                File enabled for download
              </label>
            </div>
          </div>
        </div>

        {renderMediaPickerModal(showEditorMediaPicker, () => setShowEditorMediaPicker(false), (media) => {
          setEditingFile({
            ...editingFile,
            mediaId: media.id,
            fileName: media.originalName || media.filename,
            fileSize: formatBytes(media.size || 0),
            mimeType: media.mimeType || '',
          });
          setShowEditorMediaPicker(false);
        })}
      </div>
    );
  }

  // ─── File List View ───
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gated Files</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage downloadable files for courses, whitepapers, and digital products with access control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setShowMediaPicker(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Link from Media Library
          </button>
          <label className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer">
            {uploadingFile ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAndCreate(file);
                e.target.value = '';
              }}
              disabled={uploadingFile}
            />
          </label>
        </div>
      </div>

      {/* Category Manager */}
      {showCategoryManager && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">File Categories</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORIES.map((c) => (
              <span key={c.value} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs border">
                {c.label}
                <button
                  onClick={() => {
                    const updated = CATEGORIES.filter((cat) => cat.value !== c.value);
                    settingsApi.update('gated_files_categories', { categories: updated } as any).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['settings', 'gated_files_categories'] });
                      toast.success('Category removed');
                    });
                  }}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryLabel}
              onChange={(e) => {
                setNewCategoryLabel(e.target.value);
                setNewCategoryValue(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, ''));
              }}
              placeholder="New category name"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (!newCategoryLabel.trim() || !newCategoryValue.trim()) return;
                const updated = [...CATEGORIES, { value: newCategoryValue, label: newCategoryLabel.trim() }];
                settingsApi.update('gated_files_categories', { categories: updated } as any).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['settings', 'gated_files_categories'] });
                  setNewCategoryLabel('');
                  setNewCategoryValue('');
                  toast.success('Category added');
                });
              }}
              disabled={!newCategoryLabel.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Access Types</option>
          {ACCESS_TYPES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filteredFiles.length} files</span>
      </div>

      {/* File List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">
            {files.length === 0 ? 'No gated files yet' : 'No files match your filters'}
          </p>
          {files.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">Upload a file to get started</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Access</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Downloads</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400">{file.fileName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other}`}>
                      {CATEGORIES.find((c) => c.value === file.category)?.label || file.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {ACCESS_TYPES.find((a) => a.value === file.accessType)?.label || file.accessType}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{file.fileSize}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{file.downloadCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      file.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {file.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingFile(file)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this gated file?')) deleteFile(file.id);
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderMediaPickerModal(showMediaPicker, () => setShowMediaPicker(false), (media) => {
        createFromMedia(media);
        setShowMediaPicker(false);
      })}
    </div>
  );
}
