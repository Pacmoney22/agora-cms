'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { pagesApi, seoApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

export default function PagesListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [seoPageId, setSeoPageId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pages', { page, status: statusFilter }],
    queryFn: () => pagesApi.list({ page, limit: 20, status: statusFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => pagesApi.create({ title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setShowCreate(false);
      setNewTitle('');
      toast.success('Page created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Page deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => pagesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success('Page published');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) createMutation.mutate(newTitle.trim());
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your site pages and templates</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Page
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Page Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="My New Page"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Page SEO Editor Panel */}
      {seoPageId && (
        <PageSeoEditor
          pageId={seoPageId}
          onClose={() => setSeoPageId(null)}
        />
      )}

      <div className="mb-4 flex gap-2">
        {['all', 'draft', 'published', 'review', 'archived'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === 'all' ? undefined : s)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              (s === 'all' && !statusFilter) || statusFilter === s
                ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : data?.data?.length ? (
              data.data.map((pg: any) => (
                <tr key={pg.id} className={clsx('hover:bg-gray-50', seoPageId === pg.id && 'bg-blue-50')}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{pg.title}</p>
                    {pg.isTemplate && <span className="text-[10px] text-purple-600 font-medium">TEMPLATE</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">/{pg.slug}</td>
                  <td className="px-6 py-4">
                    <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_STYLES[pg.status])}>
                      {pg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">v{pg.version}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">{new Date(pg.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`http://localhost:3100?page=${pg.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">Edit</a>
                      <button
                        onClick={() => setSeoPageId(seoPageId === pg.id ? null : pg.id)}
                        className={clsx(
                          'text-xs font-medium',
                          seoPageId === pg.id ? 'text-blue-700 underline' : 'text-blue-600 hover:text-blue-700',
                        )}
                      >
                        SEO
                      </button>
                      {pg.status === 'draft' && (
                        <button onClick={() => publishMutation.mutate(pg.id)} className="text-xs text-green-600 hover:text-green-700">Publish</button>
                      )}
                      <button onClick={() => { if (confirm(`Delete "${pg.title}"?`)) deleteMutation.mutate(pg.id); }} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">No pages found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages} className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page SEO Editor ────────────────────────────────────────────────────────

function SeoScorePanel({ pageId }: { pageId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['seo-analysis', pageId],
    queryFn: () => seoApi.analyze(pageId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 animate-pulse">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-2 w-40 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const gradeColors: Record<string, string> = {
    A: 'bg-green-500',
    B: 'bg-green-400',
    C: 'bg-yellow-400',
    D: 'bg-orange-400',
    F: 'bg-red-500',
  };

  const statusIcon = (status: string) => {
    if (status === 'pass') return <span className="text-green-500">&#10003;</span>;
    if (status === 'warning') return <span className="text-amber-500">&#9888;</span>;
    return <span className="text-red-500">&#10007;</span>;
  };

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg ${gradeColors[analysis.grade] || 'bg-gray-400'}`}>
          {analysis.grade}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">SEO Score: {analysis.overallScore}/100</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {analysis.checks.filter((c) => c.status === 'pass').length} of {analysis.checks.length} checks passed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Re-analyze
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-1.5">
          {analysis.checks.map((check) => (
            <div key={check.check} className="flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2">
              <span className="mt-0.5 text-xs shrink-0">{statusIcon(check.status)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-800">{check.check}</span>
                  <span className="text-[10px] text-gray-400">{check.score}/{check.maxScore}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PageSeoEditor({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    metaTitle: '',
    metaDescription: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    canonicalUrl: '',
    noIndex: false,
    twitterCardType: '',
  });
  const [dirty, setDirty] = useState(false);

  const { data: seoData, isLoading } = useQuery({
    queryKey: ['page-seo', pageId],
    queryFn: () => seoApi.getPageSeo(pageId),
  });

  // Load data into form when fetched
  useState(() => {
    if (seoData) {
      setForm({
        metaTitle: seoData.metaTitle || '',
        metaDescription: seoData.metaDescription || '',
        ogTitle: seoData.ogTitle || '',
        ogDescription: seoData.ogDescription || '',
        ogImage: seoData.ogImage || '',
        canonicalUrl: seoData.canonicalUrl || '',
        noIndex: seoData.noIndex ?? false,
        twitterCardType: seoData.twitterCardType || '',
      });
    }
  });

  // Re-sync when seoData changes
  const [prevData, setPrevData] = useState<any>(null);
  if (seoData && seoData !== prevData) {
    setPrevData(seoData);
    setForm({
      metaTitle: seoData.metaTitle || '',
      metaDescription: seoData.metaDescription || '',
      ogTitle: seoData.ogTitle || '',
      ogDescription: seoData.ogDescription || '',
      ogImage: seoData.ogImage || '',
      canonicalUrl: seoData.canonicalUrl || '',
      noIndex: seoData.noIndex ?? false,
      twitterCardType: seoData.twitterCardType || '',
    });
    setDirty(false);
  }

  const mutation = useMutation({
    mutationFn: (data: typeof form) => seoApi.updatePageSeo(pageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-seo', pageId] });
      queryClient.invalidateQueries({ queryKey: ['seo-analysis', pageId] });
      toast.success('Page SEO saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="mb-6 rounded-lg bg-white p-5 shadow animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg bg-white shadow">
      <SeoScorePanel pageId={pageId} />
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Page SEO &amp; Social Card Settings</h2>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved</span>}
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!dirty || mutation.isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save SEO'}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Search Engine */}
        <div>
          <h3 className="mb-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Search Engine</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => update('metaTitle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Page title for search engines"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.metaTitle.length}/70 characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                value={form.metaDescription}
                onChange={(e) => update('metaDescription', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Brief description for search engine results"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.metaDescription.length}/160 characters</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Canonical URL</label>
                <input
                  type="url"
                  value={form.canonicalUrl}
                  onChange={(e) => update('canonicalUrl', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Leave empty to use default"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.noIndex}
                    onChange={(e) => update('noIndex', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  No Index (hide from search engines)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Social Sharing */}
        <div className="border-t border-gray-200 pt-5">
          <h3 className="mb-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Social Media Card</h3>
          <p className="mb-3 text-[10px] text-gray-400">
            Override how this page appears when shared on Facebook, Twitter/X, LinkedIn, etc. Leave empty to inherit from SEO defaults.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">OG Title</label>
              <input
                type="text"
                value={form.ogTitle}
                onChange={(e) => update('ogTitle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Falls back to Meta Title if empty"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.ogTitle.length}/70 characters</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">OG Description</label>
              <textarea
                value={form.ogDescription}
                onChange={(e) => update('ogDescription', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Falls back to Meta Description if empty"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.ogDescription.length}/200 characters</p>
            </div>
            <MediaPicker
              label="OG Image"
              value={form.ogImage}
              onChange={(v) => update('ogImage', v as string)}
              accept="image/*"
              helpText="Image shown when shared on social media (recommended 1200x630). Falls back to site default."
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Twitter Card Type</label>
              <select
                value={form.twitterCardType}
                onChange={(e) => update('twitterCardType', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Use site default</option>
                <option value="summary">Summary (small image)</option>
                <option value="summary_large_image">Summary with Large Image</option>
                <option value="app">App</option>
                <option value="player">Player</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border-t border-gray-200 pt-5">
          <h3 className="mb-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Preview</h3>
          <div className="rounded-lg border border-gray-200 overflow-hidden max-w-md">
            {(form.ogImage) && (
              <div className="aspect-[1200/630] bg-gray-100">
                <img
                  src={form.ogImage}
                  alt="OG Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-gray-400 truncate">example.com</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {form.ogTitle || form.metaTitle || 'Page Title'}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {form.ogDescription || form.metaDescription || 'Page description will appear here...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
