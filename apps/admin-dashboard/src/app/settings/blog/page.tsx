'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

interface BlogSettings {
  slug: string;
  postsPerPage: number;
  defaultCategory: string;
  enableComments: boolean;
  moderateComments: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showReadingTime: boolean;
  showShareButtons: boolean;
  shareButtons: string[];
  excerptLength: number;
  dateFormat: string;
}

const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  slug: 'blog',
  postsPerPage: 10,
  defaultCategory: 'General',
  enableComments: true,
  moderateComments: true,
  showAuthor: true,
  showDate: true,
  showReadingTime: true,
  showShareButtons: true,
  shareButtons: ['twitter', 'facebook', 'linkedin', 'email'],
  excerptLength: 160,
  dateFormat: 'MMM d, yyyy',
};

const SHARE_OPTIONS = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const DATE_FORMATS = [
  { value: 'MMM d, yyyy', label: 'Jan 1, 2026' },
  { value: 'MMMM d, yyyy', label: 'January 1, 2026' },
  { value: 'd MMM yyyy', label: '1 Jan 2026' },
  { value: 'MM/dd/yyyy', label: '01/01/2026' },
  { value: 'dd/MM/yyyy', label: '01/01/2026 (DD/MM)' },
  { value: 'yyyy-MM-dd', label: '2026-01-01' },
];

export default function BlogSettingsPage() {
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery({
    queryKey: ['settings', 'blog_settings'],
    queryFn: () => settingsApi.get('blog_settings').catch(() => DEFAULT_BLOG_SETTINGS),
  });

  const { data: registry } = useQuery({
    queryKey: ['settings', 'articles_registry'],
    queryFn: () => settingsApi.get('articles_registry').catch(() => ({ articles: [], categories: ['General', 'News', 'Tutorial', 'Announcement'] })),
  });

  const [settings, setSettings] = useState<BlogSettings>(DEFAULT_BLOG_SETTINGS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saved) setSettings({ ...DEFAULT_BLOG_SETTINGS, ...saved });
  }, [saved]);

  const categories: string[] = registry?.categories || ['General', 'News', 'Tutorial', 'Announcement'];

  const update = (key: keyof BlogSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const toggleShare = (platform: string) => {
    const current = settings.shareButtons;
    const next = current.includes(platform)
      ? current.filter((s) => s !== platform)
      : [...current, platform];
    update('shareButtons', next);
  };

  const saveMutation = useMutation({
    mutationFn: (data: BlogSettings) => settingsApi.update('blog_settings', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'blog_settings'] });
      toast.success('Blog settings saved');
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
          <h1 className="text-2xl font-bold text-gray-900">Blog Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure blog display, URLs, and behavior</p>
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
        {/* URL Configuration */}
        <div className="rounded-lg bg-white p-6 shadow space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">URL Configuration</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Blog URL Path</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">yoursite.com /</span>
              <input
                type="text"
                value={settings.slug}
                onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="blog"
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              Article URLs will be: yoursite.com/{settings.slug || 'blog'}/article-slug
            </p>
          </div>
        </div>

        {/* Display Settings */}
        <div className="rounded-lg bg-white p-6 shadow space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Display Settings</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Posts Per Page</label>
              <input
                type="number"
                value={settings.postsPerPage}
                onChange={(e) => update('postsPerPage', parseInt(e.target.value) || 10)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Excerpt Length</label>
              <input
                type="number"
                value={settings.excerptLength}
                onChange={(e) => update('excerptLength', parseInt(e.target.value) || 160)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min={50}
                max={500}
              />
              <p className="mt-1 text-[10px] text-gray-400">Characters for auto-generated excerpts</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Category</label>
              <select
                value={settings.defaultCategory}
                onChange={(e) => update('defaultCategory', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => update('dateFormat', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showAuthor}
                onChange={(e) => update('showAuthor', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Show author name on articles
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showDate}
                onChange={(e) => update('showDate', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Show publish date on articles
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showReadingTime}
                onChange={(e) => update('showReadingTime', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Show estimated reading time
            </label>
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-lg bg-white p-6 shadow space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableComments}
              onChange={(e) => update('enableComments', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
            />
            Enable comments on blog posts by default
          </label>
          {settings.enableComments && (
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer ml-5">
              <input
                type="checkbox"
                checked={settings.moderateComments}
                onChange={(e) => update('moderateComments', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Require approval before comments are published
            </label>
          )}
        </div>

        {/* Social Sharing */}
        <div className="rounded-lg bg-white p-6 shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Social Sharing</h2>
            <button
              onClick={() => update('showShareButtons', !settings.showShareButtons)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showShareButtons ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={settings.showShareButtons}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settings.showShareButtons ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {settings.showShareButtons && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400">Select which share buttons to display on articles</p>
              {SHARE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shareButtons.includes(opt.value)}
                    onChange={() => toggleShare(opt.value)}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
