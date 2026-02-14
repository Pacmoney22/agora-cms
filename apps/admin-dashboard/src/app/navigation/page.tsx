'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { navigationApi, pagesApi } from '@/lib/api-client';
import { NavigationTreeEditor, type NavItem, type PageOption } from '@/components/navigation/NavigationTreeEditor';

const LOCATIONS = [
  { key: 'header', label: 'Header', description: 'Main site navigation bar' },
  { key: 'footer', label: 'Footer', description: 'Footer link columns' },
  { key: 'sidebar', label: 'Sidebar', description: 'Sidebar/secondary navigation' },
  { key: 'mobile', label: 'Mobile', description: 'Mobile menu overlay' },
];

export default function NavigationPage() {
  const queryClient = useQueryClient();
  const [activeLocation, setActiveLocation] = useState('header');
  const [pendingItems, setPendingItems] = useState<NavItem[] | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const { data: navData, isLoading } = useQuery({
    queryKey: ['navigation', activeLocation],
    queryFn: () => navigationApi.get(activeLocation).catch(() => null),
  });

  // Fetch pages for the page picker
  const { data: pagesData } = useQuery({
    queryKey: ['pages', 'nav-picker'],
    queryFn: () => pagesApi.list({ limit: 200 }),
  });

  const pages: PageOption[] = (pagesData?.data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
  }));

  const saveMutation = useMutation({
    mutationFn: (items: NavItem[]) => navigationApi.upsert(activeLocation, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
      toast.success(`${activeLocation} navigation saved`);
      setHasUnsaved(false);
      setPendingItems(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentItems: NavItem[] = pendingItems ?? navData?.items ?? [];

  const handleChange = useCallback((newItems: NavItem[]) => {
    setPendingItems(newItems);
    setHasUnsaved(true);
  }, []);

  const handleSave = () => {
    saveMutation.mutate(currentItems);
  };

  const handleDiscard = () => {
    setPendingItems(null);
    setHasUnsaved(false);
  };

  const handleTabSwitch = (loc: string) => {
    if (hasUnsaved) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setActiveLocation(loc);
    setPendingItems(null);
    setHasUnsaved(false);
  };

  const activeLocationInfo = LOCATIONS.find((l) => l.key === activeLocation);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build and organize navigation menus for different areas of your site.
          Drag items to reorder, or use the arrow buttons to move and nest items.
        </p>
      </div>

      {/* Location Tabs */}
      <div className="mb-6 flex gap-2">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.key}
            onClick={() => handleTabSwitch(loc.key)}
            className={clsx(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeLocation === loc.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Editor Card */}
      <div className="rounded-lg bg-white shadow">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{activeLocationInfo?.label} Menu</h2>
            <p className="mt-0.5 text-xs text-gray-400">{activeLocationInfo?.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsaved && (
              <>
                <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
                <button
                  onClick={handleDiscard}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Discard
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasUnsaved}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Tree Editor */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            </div>
          ) : (
            <NavigationTreeEditor
              items={currentItems}
              onChange={handleChange}
              maxDepth={3}
              pages={pages}
            />
          )}
        </div>

        {/* Help text */}
        <div className="border-t border-gray-100 px-6 py-3">
          <p className="text-[11px] text-gray-400">
            <strong>Tip:</strong> Click an item to expand its editor. Choose &quot;Page&quot; to link to a CMS page,
            &quot;Custom URL&quot; for internal paths or external links, or &quot;No Link&quot; for parent-only items.
            Use the indent/outdent buttons to create sub-menus. Drag items to reorder.
          </p>
        </div>
      </div>
    </div>
  );
}
