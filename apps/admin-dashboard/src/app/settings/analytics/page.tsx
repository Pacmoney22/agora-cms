'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

interface AnalyticsSettings {
  provider: string;
  measurementId: string;
  enabled: boolean;
  trackingConfig: {
    anonymizeIp: boolean;
    trackPageViews: boolean;
    trackEcommerce: boolean;
    trackCourseProgress: boolean;
    cookieConsent: boolean;
  };
}

const DEFAULT_ANALYTICS: AnalyticsSettings = {
  provider: 'ga4',
  measurementId: '',
  enabled: false,
  trackingConfig: {
    anonymizeIp: true,
    trackPageViews: true,
    trackEcommerce: true,
    trackCourseProgress: true,
    cookieConsent: true,
  },
};

export default function AnalyticsSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'analytics'],
    queryFn: () => settingsApi.get('analytics'),
  });

  const [form, setForm] = useState<AnalyticsSettings>(DEFAULT_ANALYTICS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULT_ANALYTICS,
        ...settings,
        trackingConfig: { ...DEFAULT_ANALYTICS.trackingConfig, ...settings.trackingConfig },
      });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: AnalyticsSettings) => settingsApi.update('analytics', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Analytics settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateTracking = (key: string, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      trackingConfig: { ...prev.trackingConfig, [key]: value },
    }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure Google Analytics tracking for your storefront
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
        {/* Enable/Disable */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Google Analytics 4</h2>
              <p className="text-xs text-gray-500 mt-1">
                Track visitor behavior, e-commerce events, and course engagement
              </p>
            </div>
            <button
              onClick={() => update('enabled', !form.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={form.enabled}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {form.enabled && (
            <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-green-800">
                Analytics tracking is <strong>enabled</strong>. The GA4 script will be injected into your storefront.
              </p>
            </div>
          )}

          {!form.enabled && (
            <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs text-gray-600">
                Analytics tracking is <strong>disabled</strong>. No tracking scripts will be loaded.
              </p>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Measurement ID</label>
              <input
                type="text"
                value={form.measurementId}
                onChange={(e) => update('measurementId', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="G-XXXXXXXXXX"
              />
              <p className="mt-1 text-xs text-gray-400">
                Find this in Google Analytics &gt; Admin &gt; Data Streams &gt; Web
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Options */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Tracking Options</h2>
          <div className="space-y-3">
            {[
              { key: 'trackPageViews', label: 'Track Page Views', desc: 'Automatically track page navigation events' },
              { key: 'trackEcommerce', label: 'Track E-Commerce Events', desc: 'Purchase, add_to_cart, view_item, checkout events' },
              { key: 'trackCourseProgress', label: 'Track Course Progress', desc: 'Enrollment, lesson completion, quiz submission, certification events' },
              { key: 'anonymizeIp', label: 'Anonymize IP Addresses', desc: 'Strip the last octet of visitor IP addresses for privacy' },
              { key: 'cookieConsent', label: 'Require Cookie Consent', desc: 'Show a consent banner before loading tracking scripts' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.trackingConfig as any)[key]}
                  onChange={(e) => updateTracking(key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Integration Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Integration Status</h2>
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                form.enabled && form.measurementId ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm text-gray-700">
              {form.enabled && form.measurementId
                ? `Connected — tracking to ${form.measurementId}`
                : form.enabled
                  ? 'Enabled but missing Measurement ID'
                  : 'Not configured'}
            </span>
          </div>
          {form.enabled && form.measurementId && (
            <p className="mt-2 text-xs text-gray-400">
              Events will appear in your GA4 property within a few minutes of visitor activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
