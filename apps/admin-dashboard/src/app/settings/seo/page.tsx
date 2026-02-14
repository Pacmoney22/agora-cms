'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

interface SeoSettings {
  titleTemplate: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  robotsTxt: string;
  sitemapEnabled: boolean;
  sitemapChangeFreq: string;
  sitemapPriority: number;
  googleSiteVerification: string;
  bingSiteVerification: string;
  socialCards: {
    defaultOgType: string;
    twitterCardType: string;
    facebookAppId: string;
    defaultOgTitle: string;
    defaultOgDescription: string;
  };
  structuredData: {
    organizationName: string;
    organizationLogo: string;
    socialProfiles: string[];
  };
  socialMedia: {
    twitterHandle: string;
    facebookPage: string;
    linkedinPage: string;
    instagramHandle: string;
  };
}

const DEFAULT_SEO: SeoSettings = {
  titleTemplate: '%s | My Site',
  defaultTitle: 'My Site',
  defaultDescription: '',
  defaultOgImage: '',
  robotsTxt: 'User-agent: *\nAllow: /\n',
  sitemapEnabled: true,
  sitemapChangeFreq: 'weekly',
  sitemapPriority: 0.8,
  googleSiteVerification: '',
  bingSiteVerification: '',
  socialCards: {
    defaultOgType: 'website',
    twitterCardType: 'summary_large_image',
    facebookAppId: '',
    defaultOgTitle: '',
    defaultOgDescription: '',
  },
  structuredData: {
    organizationName: '',
    organizationLogo: '',
    socialProfiles: [],
  },
  socialMedia: {
    twitterHandle: '',
    facebookPage: '',
    linkedinPage: '',
    instagramHandle: '',
  },
};

export default function SeoSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'seo'],
    queryFn: () => settingsApi.get('seo'),
  });

  const [form, setForm] = useState<SeoSettings>(DEFAULT_SEO);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULT_SEO,
        ...settings,
        socialCards: { ...DEFAULT_SEO.socialCards, ...settings.socialCards },
        structuredData: { ...DEFAULT_SEO.structuredData, ...settings.structuredData },
        socialMedia: { ...DEFAULT_SEO.socialMedia, ...settings.socialMedia },
      });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: SeoSettings) => settingsApi.update('seo', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('SEO settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateStructured = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      structuredData: { ...prev.structuredData, [key]: value },
    }));
    setDirty(true);
  };

  const updateSocial = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [key]: value },
    }));
    setDirty(true);
  };

  const updateSocialCards = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialCards: { ...prev.socialCards, [key]: value },
    }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-96 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Defaults</h1>
          <p className="mt-1 text-sm text-gray-500">
            Global search engine optimization settings. Per-page SEO overrides these defaults.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!dirty || mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Title & Description */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Title &amp; Description</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title Template</label>
              <input
                type="text"
                value={form.titleTemplate}
                onChange={(e) => update('titleTemplate', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="%s | My Site"
              />
              <p className="mt-1 text-xs text-gray-400">
                Use <code className="rounded bg-gray-100 px-1">%s</code> as placeholder for the page title
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Title</label>
              <input
                type="text"
                value={form.defaultTitle}
                onChange={(e) => update('defaultTitle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="My Site — Your tagline here"
              />
              <p className="mt-1 text-xs text-gray-400">
                Used when a page doesn't have its own title
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Meta Description</label>
              <textarea
                value={form.defaultDescription}
                onChange={(e) => update('defaultDescription', e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="A brief description of your site for search engines..."
              />
              <p className="mt-1 text-xs text-gray-400">
                {form.defaultDescription.length}/160 characters
              </p>
            </div>
            <MediaPicker
              label="Default Open Graph Image"
              value={form.defaultOgImage}
              onChange={(v) => update('defaultOgImage', v)}
              accept="image/*"
              helpText="Recommended: 1200x630px. Used when shared on social media."
            />
          </div>
        </div>

        {/* Social Sharing Card Defaults */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Social Sharing Card Defaults</h2>
          <p className="mb-4 text-xs text-gray-500">
            These defaults are used when sharing pages on social media. Individual pages, products, and categories can override these.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default OG Type</label>
                <select
                  value={form.socialCards.defaultOgType}
                  onChange={(e) => updateSocialCards('defaultOgType', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="website">Website</option>
                  <option value="article">Article</option>
                  <option value="product">Product</option>
                  <option value="profile">Profile</option>
                </select>
                <p className="mt-0.5 text-[10px] text-gray-400">The og:type for pages without a specific type</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Twitter Card Type</label>
                <select
                  value={form.socialCards.twitterCardType}
                  onChange={(e) => updateSocialCards('twitterCardType', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="summary">Summary (small image)</option>
                  <option value="summary_large_image">Summary with Large Image</option>
                  <option value="app">App</option>
                  <option value="player">Player</option>
                </select>
                <p className="mt-0.5 text-[10px] text-gray-400">Default Twitter/X card format</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Facebook App ID</label>
              <input
                type="text"
                value={form.socialCards.facebookAppId}
                onChange={(e) => updateSocialCards('facebookAppId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your Facebook App ID for insights"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">Enables Facebook domain insights and link attribution</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default OG Title</label>
              <input
                type="text"
                value={form.socialCards.defaultOgTitle}
                onChange={(e) => updateSocialCards('defaultOgTitle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Falls back to SEO title if empty"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.socialCards.defaultOgTitle.length}/70 characters — Title shown in social media cards</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default OG Description</label>
              <textarea
                value={form.socialCards.defaultOgDescription}
                onChange={(e) => updateSocialCards('defaultOgDescription', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Falls back to meta description if empty"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">{form.socialCards.defaultOgDescription.length}/200 characters — Description shown in social media cards</p>
            </div>
          </div>
        </div>

        {/* Search Verification */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Search Verification</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Google Site Verification</label>
              <input
                type="text"
                value={form.googleSiteVerification}
                onChange={(e) => update('googleSiteVerification', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Verification code from Google Search Console"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bing Site Verification</label>
              <input
                type="text"
                value={form.bingSiteVerification}
                onChange={(e) => update('bingSiteVerification', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Verification code from Bing Webmaster Tools"
              />
            </div>
          </div>
        </div>

        {/* Sitemap */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Sitemap</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sitemapEnabled}
                onChange={(e) => update('sitemapEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Enable XML Sitemap
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default Change Frequency</label>
                <select
                  value={form.sitemapChangeFreq}
                  onChange={(e) => update('sitemapChangeFreq', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Default Priority: {form.sitemapPriority}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.sitemapPriority}
                  onChange={(e) => update('sitemapPriority', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Robots.txt */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Robots.txt</h2>
          <textarea
            value={form.robotsTxt}
            onChange={(e) => update('robotsTxt', e.target.value)}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Controls which pages search engines can crawl. Be careful with Disallow rules.
          </p>
        </div>

        {/* Social Media */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Social Media Profiles</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Twitter / X Handle</label>
              <input
                type="text"
                value={form.socialMedia.twitterHandle}
                onChange={(e) => updateSocial('twitterHandle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="@yourhandle"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Facebook Page URL</label>
              <input
                type="text"
                value={form.socialMedia.facebookPage}
                onChange={(e) => updateSocial('facebookPage', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn Page URL</label>
              <input
                type="text"
                value={form.socialMedia.linkedinPage}
                onChange={(e) => updateSocial('linkedinPage', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Instagram Handle</label>
              <input
                type="text"
                value={form.socialMedia.instagramHandle}
                onChange={(e) => updateSocial('instagramHandle', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="@yourhandle"
              />
            </div>
          </div>
        </div>

        {/* Structured Data */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Structured Data (Schema.org)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={form.structuredData.organizationName}
                onChange={(e) => updateStructured('organizationName', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your Organization Name"
              />
            </div>
            <MediaPicker
              label="Organization Logo"
              value={form.structuredData.organizationLogo}
              onChange={(v) => updateStructured('organizationLogo', v)}
              accept="image/*,.svg"
              helpText="Used in Organization schema markup for Google Knowledge Panel"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
