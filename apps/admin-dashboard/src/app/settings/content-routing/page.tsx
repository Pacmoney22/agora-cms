'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, pagesApi } from '@/lib/api-client';

interface ContentTypeRoute {
  basePath: string;
  listingPageId: string | null;
  detailPageId: string | null;
}

interface ContentRoutingSettings {
  blog: ContentTypeRoute;
  product: ContentTypeRoute;
  event: ContentTypeRoute;
  course: ContentTypeRoute;
}

const DEFAULTS: ContentRoutingSettings = {
  blog:    { basePath: '/blog',     listingPageId: null, detailPageId: null },
  product: { basePath: '/products', listingPageId: null, detailPageId: null },
  event:   { basePath: '/events',   listingPageId: null, detailPageId: null },
  course:  { basePath: '/courses',  listingPageId: null, detailPageId: null },
};

const CONTENT_TYPES: { key: keyof ContentRoutingSettings; label: string; icon: string; description: string }[] = [
  { key: 'blog',    label: 'Blog / Articles', icon: '📰', description: 'Blog posts and articles' },
  { key: 'product', label: 'Products',        icon: '🛍',  description: 'Commerce product pages' },
  { key: 'event',   label: 'Events',          icon: '📅', description: 'Event listing and detail pages' },
  { key: 'course',  label: 'Courses',         icon: '📚', description: 'Course catalog and detail pages' },
];

interface PageOption {
  id: string;
  title: string;
  slug: string;
}

export default function ContentRoutingPage() {
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery({
    queryKey: ['settings', 'content_routing'],
    queryFn: () => settingsApi.get('content_routing').catch(() => DEFAULTS),
  });

  const { data: pagesData } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: () => pagesApi.list({ status: 'published', limit: 200 }),
  });

  const [settings, setSettings] = useState<ContentRoutingSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saved) {
      setSettings({
        blog:    { ...DEFAULTS.blog,    ...saved.blog },
        product: { ...DEFAULTS.product, ...saved.product },
        event:   { ...DEFAULTS.event,   ...saved.event },
        course:  { ...DEFAULTS.course,  ...saved.course },
      });
    }
  }, [saved]);

  const pages: PageOption[] = pagesData?.data?.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
  })) ?? [];

  const updateRoute = (type: keyof ContentRoutingSettings, field: keyof ContentTypeRoute, value: string | null) => {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: ContentRoutingSettings) => settingsApi.update('content_routing', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'content_routing'] });
      toast.success('Content routing saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Routing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure URL paths and assign CMS pages for listing and detail views
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate(settings)}
          disabled={!dirty || saveMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="max-w-2xl space-y-6">
        {CONTENT_TYPES.map(({ key, label, icon, description }) => {
          const route = settings[key];
          const listingPage = pages.find((p) => p.id === route.listingPageId);
          const detailPage = pages.find((p) => p.id === route.detailPageId);

          return (
            <div key={key} className="rounded-lg bg-white p-6 shadow space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
              </div>

              {/* Base Path */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Base Path</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">yoursite.com</span>
                  <input
                    type="text"
                    value={route.basePath}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('/')) val = '/' + val;
                      val = val.toLowerCase().replace(/[^a-z0-9/-]/g, '');
                      updateRoute(key, 'basePath', val);
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="/blog"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  Listing: yoursite.com{route.basePath} &middot; Detail: yoursite.com{route.basePath}/item-slug
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Listing Page */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Listing Page</label>
                  <select
                    value={route.listingPageId ?? ''}
                    onChange={(e) => updateRoute(key, 'listingPageId', e.target.value || null)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select a page --</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (/{p.slug})
                      </option>
                    ))}
                  </select>
                  {listingPage && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      /{listingPage.slug}
                    </p>
                  )}
                </div>

                {/* Detail Page */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Detail Page</label>
                  <select
                    value={route.detailPageId ?? ''}
                    onChange={(e) => updateRoute(key, 'detailPageId', e.target.value || null)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select a page --</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (/{p.slug})
                      </option>
                    ))}
                  </select>
                  {detailPage && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      /{detailPage.slug}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Info box */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-700">
          <strong>How it works:</strong> When a visitor goes to <code>yoursite.com/blog</code>,
          the storefront loads the Listing Page you selected for Blog. When they click an article
          and go to <code>yoursite.com/blog/my-article</code>, the storefront loads the Detail Page
          and injects that article&apos;s data into the page components.
        </div>
      </div>
    </div>
  );
}
