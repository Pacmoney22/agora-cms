'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, pagesApi } from '@/lib/api-client';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaPicker } from '@/components/MediaPicker';

interface SiteStatusSettings {
  isLive: boolean;
  comingSoon: {
    pageSource: 'built-in' | 'page-builder';
    comingSoonPageId: string;
    headline: string;
    message: string;
    backgroundImage: string;
    logoImage: string;
    showCountdown: boolean;
    launchDate: string;
    showEmailSignup: boolean;
    emailPlaceholder: string;
    emailButtonText: string;
    socialLinks: { platform: string; url: string }[];
    customCss: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
  maintenance: {
    enabled: boolean;
    pageSource: 'built-in' | 'page-builder';
    maintenancePageId: string;
    headline: string;
    message: string;
    allowedIps: string;
  };
}

const DEFAULT_SETTINGS: SiteStatusSettings = {
  isLive: false,
  comingSoon: {
    pageSource: 'built-in',
    comingSoonPageId: '',
    headline: 'Coming Soon',
    message: '<p>We\'re working on something amazing. Stay tuned!</p>',
    backgroundImage: '',
    logoImage: '',
    showCountdown: false,
    launchDate: '',
    showEmailSignup: true,
    emailPlaceholder: 'Enter your email',
    emailButtonText: 'Notify Me',
    socialLinks: [],
    customCss: '',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#2563eb',
  },
  maintenance: {
    enabled: false,
    pageSource: 'built-in',
    maintenancePageId: '',
    headline: 'Under Maintenance',
    message: '<p>We\'re performing scheduled maintenance. We\'ll be back shortly.</p>',
    allowedIps: '',
  },
};

const SOCIAL_PLATFORMS = ['Twitter / X', 'Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'GitHub'];

export default function SiteStatusPage() {
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery({
    queryKey: ['settings', 'site_status'],
    queryFn: () => settingsApi.get('site_status').catch(() => DEFAULT_SETTINGS),
  });

  const { data: pagesData } = useQuery({
    queryKey: ['pages', 'published'],
    queryFn: () => pagesApi.list({ status: 'published', limit: 200 }),
  });
  const publishedPages = pagesData?.data ?? [];

  const [settings, setSettings] = useState<SiteStatusSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'coming-soon' | 'maintenance'>('status');
  const [newSocialPlatform, setNewSocialPlatform] = useState('Twitter / X');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  useEffect(() => {
    if (saved) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...saved,
        comingSoon: { ...DEFAULT_SETTINGS.comingSoon, ...saved.comingSoon },
        maintenance: { ...DEFAULT_SETTINGS.maintenance, ...saved.maintenance },
      });
    }
  }, [saved]);

  const updateRoot = (key: keyof SiteStatusSettings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateComingSoon = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, comingSoon: { ...prev.comingSoon, [key]: value } }));
    setDirty(true);
  };

  const updateMaintenance = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, maintenance: { ...prev.maintenance, [key]: value } }));
    setDirty(true);
  };

  const addSocialLink = () => {
    if (!newSocialUrl.trim()) return;
    updateComingSoon('socialLinks', [
      ...settings.comingSoon.socialLinks,
      { platform: newSocialPlatform, url: newSocialUrl.trim() },
    ]);
    setNewSocialUrl('');
  };

  const removeSocialLink = (index: number) => {
    updateComingSoon('socialLinks', settings.comingSoon.socialLinks.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: (data: SiteStatusSettings) => settingsApi.update('site_status', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'site_status'] });
      toast.success('Site status settings saved');
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
          <h1 className="text-2xl font-bold text-gray-900">Site Status</h1>
          <p className="mt-1 text-sm text-gray-500">Control whether your site is live, in coming soon, or maintenance mode</p>
        </div>
        <button
          onClick={() => saveMutation.mutate(settings)}
          disabled={!dirty || saveMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Live / Coming Soon Toggle */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Site Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {settings.isLive
                ? 'Your site is live and accessible to visitors'
                : 'Your site shows the Coming Soon page to visitors'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${settings.isLive ? 'text-gray-400' : 'text-amber-600'}`}>
              Coming Soon
            </span>
            <button
              onClick={() => { updateRoot('isLive', !settings.isLive); }}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${settings.isLive ? 'bg-green-500' : 'bg-amber-500'}`}
              role="switch"
              aria-checked={settings.isLive}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${settings.isLive ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-medium ${settings.isLive ? 'text-green-600' : 'text-gray-400'}`}>
              Live
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
          settings.isLive ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <span className={`inline-block h-2 w-2 rounded-full ${settings.isLive ? 'bg-green-500' : 'bg-amber-500'}`} />
          {settings.isLive
            ? 'Your site is currently live and publicly accessible.'
            : 'Your site is currently showing the Coming Soon page. Only admins can view the full site.'}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {([
          { key: 'coming-soon' as const, label: 'Coming Soon Page' },
          { key: 'maintenance' as const, label: 'Maintenance Mode' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Coming Soon Tab */}
      {activeTab === 'coming-soon' && (
        <div className="max-w-2xl space-y-6">
          {/* Page Source */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Page Source</h3>
            <p className="text-[10px] text-gray-400">Choose whether to use the built-in editor below or a page you&apos;ve created in the Page Builder.</p>
            <div className="flex gap-3">
              {(['built-in', 'page-builder'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => updateComingSoon('pageSource', src)}
                  className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                    settings.comingSoon.pageSource === src
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {src === 'built-in' ? 'Built-in Editor' : 'Page Builder Page'}
                </button>
              ))}
            </div>
            {settings.comingSoon.pageSource === 'page-builder' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Page</label>
                <select
                  value={settings.comingSoon.comingSoonPageId}
                  onChange={(e) => updateComingSoon('comingSoonPageId', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Select a page --</option>
                  {publishedPages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                {!settings.comingSoon.comingSoonPageId && (
                  <p className="mt-1 text-[10px] text-amber-600">Please select a page to use as your Coming Soon page.</p>
                )}
              </div>
            )}
          </div>

          {/* Content (only shown for built-in source) */}
          {settings.comingSoon.pageSource === 'built-in' && (<>
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Page Content</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Headline</label>
              <input
                type="text"
                value={settings.comingSoon.headline}
                onChange={(e) => updateComingSoon('headline', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Coming Soon"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <RichTextEditor
                value={settings.comingSoon.message}
                onChange={(html) => updateComingSoon('message', html)}
                placeholder="Tell visitors what you're building..."
              />
            </div>
          </div>

          {/* Branding */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Branding</h3>
            <MediaPicker
              value={settings.comingSoon.logoImage}
              onChange={(url) => updateComingSoon('logoImage', url)}
              label="Logo"
              accept="image/*"
              helpText="Your brand logo displayed on the coming soon page"
            />
            <MediaPicker
              value={settings.comingSoon.backgroundImage}
              onChange={(url) => updateComingSoon('backgroundImage', url)}
              label="Background Image"
              accept="image/*"
              helpText="Optional background image for the coming soon page"
            />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.comingSoon.backgroundColor}
                    onChange={(e) => updateComingSoon('backgroundColor', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.comingSoon.backgroundColor}
                    onChange={(e) => updateComingSoon('backgroundColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.comingSoon.textColor}
                    onChange={(e) => updateComingSoon('textColor', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.comingSoon.textColor}
                    onChange={(e) => updateComingSoon('textColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.comingSoon.accentColor}
                    onChange={(e) => updateComingSoon('accentColor', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.comingSoon.accentColor}
                    onChange={(e) => updateComingSoon('accentColor', e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Countdown Timer</h3>
              <button
                onClick={() => updateComingSoon('showCountdown', !settings.comingSoon.showCountdown)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.comingSoon.showCountdown ? 'bg-blue-600' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={settings.comingSoon.showCountdown}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settings.comingSoon.showCountdown ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.comingSoon.showCountdown && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Launch Date</label>
                <input
                  type="datetime-local"
                  value={settings.comingSoon.launchDate?.slice(0, 16) || ''}
                  onChange={(e) => updateComingSoon('launchDate', new Date(e.target.value).toISOString())}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Displays a countdown to this date on the coming soon page
                </p>
              </div>
            )}
          </div>

          {/* Email Signup */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Email Signup</h3>
              <button
                onClick={() => updateComingSoon('showEmailSignup', !settings.comingSoon.showEmailSignup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.comingSoon.showEmailSignup ? 'bg-blue-600' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={settings.comingSoon.showEmailSignup}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settings.comingSoon.showEmailSignup ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.comingSoon.showEmailSignup && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    value={settings.comingSoon.emailPlaceholder}
                    onChange={(e) => updateComingSoon('emailPlaceholder', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={settings.comingSoon.emailButtonText}
                    onChange={(e) => updateComingSoon('emailButtonText', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Social Links</h3>
            <p className="text-[10px] text-gray-400">Add social media links displayed on the coming soon page</p>

            {settings.comingSoon.socialLinks.length > 0 && (
              <div className="space-y-2">
                {settings.comingSoon.socialLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-xs font-medium text-gray-700 w-24 shrink-0">{link.platform}</span>
                    <span className="flex-1 text-xs text-gray-500 truncate font-mono">{link.url}</span>
                    <button
                      onClick={() => removeSocialLink(i)}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <select
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value)}
                className="w-36 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="url"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSocialLink()}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                placeholder="https://twitter.com/yourhandle"
              />
              <button
                onClick={addSocialLink}
                disabled={!newSocialUrl.trim()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Custom CSS</h3>
            <textarea
              value={settings.comingSoon.customCss}
              onChange={(e) => updateComingSoon('customCss', e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              placeholder={`/* Custom styles for the coming soon page */\n.coming-soon-headline {\n  font-size: 3rem;\n}`}
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview</h3>
            <div
              className="rounded-lg border border-gray-200 overflow-hidden"
              style={{
                backgroundColor: settings.comingSoon.backgroundColor,
                color: settings.comingSoon.textColor,
              }}
            >
              <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
                {settings.comingSoon.logoImage && (
                  <div className="mb-4 h-12 w-12 rounded-md bg-gray-200/30 flex items-center justify-center text-[10px] text-gray-400">
                    Logo
                  </div>
                )}
                <h2 className="text-xl font-bold mb-2">{settings.comingSoon.headline || 'Coming Soon'}</h2>
                <div
                  className="text-xs max-w-sm opacity-80"
                  dangerouslySetInnerHTML={{ __html: settings.comingSoon.message }}
                />
                {settings.comingSoon.showCountdown && settings.comingSoon.launchDate && (
                  <div className="mt-4 flex gap-4">
                    {['Days', 'Hours', 'Min', 'Sec'].map((unit) => (
                      <div key={unit} className="text-center">
                        <div className="text-lg font-bold" style={{ color: settings.comingSoon.accentColor }}>00</div>
                        <div className="text-[9px] opacity-60">{unit}</div>
                      </div>
                    ))}
                  </div>
                )}
                {settings.comingSoon.showEmailSignup && (
                  <div className="mt-4 flex gap-2">
                    <div className="rounded-md border border-gray-300/30 bg-white/10 px-3 py-1.5 text-[10px] opacity-60 w-40">
                      {settings.comingSoon.emailPlaceholder}
                    </div>
                    <div
                      className="rounded-md px-3 py-1.5 text-[10px] text-white font-medium"
                      style={{ backgroundColor: settings.comingSoon.accentColor }}
                    >
                      {settings.comingSoon.emailButtonText}
                    </div>
                  </div>
                )}
                {settings.comingSoon.socialLinks.length > 0 && (
                  <div className="mt-4 flex gap-3">
                    {settings.comingSoon.socialLinks.map((link, i) => (
                      <span key={i} className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer">
                        {link.platform}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </>)}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Maintenance Mode</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Temporarily show a maintenance page (overrides live/coming soon status)
                </p>
              </div>
              <button
                onClick={() => updateMaintenance('enabled', !settings.maintenance.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenance.enabled ? 'bg-red-500' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={settings.maintenance.enabled}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${settings.maintenance.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {settings.maintenance.enabled && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                Maintenance mode is active. Your site currently shows the maintenance page to all visitors.
              </div>
            )}
          </div>

          {/* Page Source */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Page Source</h3>
            <p className="text-[10px] text-gray-400">Choose whether to use the built-in editor or a page from the Page Builder.</p>
            <div className="flex gap-3">
              {(['built-in', 'page-builder'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => updateMaintenance('pageSource', src)}
                  className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                    settings.maintenance.pageSource === src
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {src === 'built-in' ? 'Built-in Editor' : 'Page Builder Page'}
                </button>
              ))}
            </div>
            {settings.maintenance.pageSource === 'page-builder' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Page</label>
                <select
                  value={settings.maintenance.maintenancePageId}
                  onChange={(e) => updateMaintenance('maintenancePageId', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Select a page --</option>
                  {publishedPages.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                {!settings.maintenance.maintenancePageId && (
                  <p className="mt-1 text-[10px] text-amber-600">Please select a page to use as your Maintenance page.</p>
                )}
              </div>
            )}
          </div>

          {settings.maintenance.pageSource === 'built-in' && (<>
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Maintenance Page Content</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Headline</label>
              <input
                type="text"
                value={settings.maintenance.headline}
                onChange={(e) => updateMaintenance('headline', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Under Maintenance"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <RichTextEditor
                value={settings.maintenance.message}
                onChange={(html) => updateMaintenance('message', html)}
                placeholder="Explain the maintenance to visitors..."
              />
            </div>
          </div>
          </>)}

          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">IP Allowlist</h3>
            <p className="text-[10px] text-gray-400">
              These IP addresses can bypass maintenance mode and view the full site
            </p>
            <textarea
              value={settings.maintenance.allowedIps}
              onChange={(e) => updateMaintenance('allowedIps', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              placeholder="Enter one IP address per line&#10;192.168.1.1&#10;10.0.0.1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
