'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

interface PaymentsSettings {
  provider: string;
  enabled: boolean;
  mode: 'test' | 'live';
  testPublishableKey: string;
  testSecretKey: string;
  testWebhookSecret: string;
  livePublishableKey: string;
  liveSecretKey: string;
  liveWebhookSecret: string;
  currency: string;
  statementDescriptor: string;
  paymentMethods: string[];
  captureMethod: string;
}

const DEFAULT_PAYMENTS: PaymentsSettings = {
  provider: 'stripe',
  enabled: false,
  mode: 'test',
  testPublishableKey: '',
  testSecretKey: '',
  testWebhookSecret: '',
  livePublishableKey: '',
  liveSecretKey: '',
  liveWebhookSecret: '',
  currency: 'USD',
  statementDescriptor: '',
  paymentMethods: ['card'],
  captureMethod: 'automatic',
};

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
];

function MaskedInput({
  label,
  value,
  onChange,
  placeholder,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  helpText?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isMasked = value.includes('••••');

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (isMasked) onChange(''); }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
    </div>
  );
}

export default function PaymentsSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'payments'],
    queryFn: () => settingsApi.get('payments'),
  });

  const [form, setForm] = useState<PaymentsSettings>(DEFAULT_PAYMENTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULT_PAYMENTS, ...settings });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: PaymentsSettings) => settingsApi.update('payments', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Payment settings saved');
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure Stripe payment processing for your store
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
        {/* Enable/Disable + Mode */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Stripe Payments</h2>
              <p className="text-xs text-gray-500 mt-1">
                Accept credit cards, debit cards, and more via Stripe
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

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => update('mode', 'test')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                form.mode === 'test'
                  ? 'bg-amber-50 text-amber-800 border-r border-gray-200'
                  : 'text-gray-500 hover:bg-gray-50 border-r border-gray-200'
              }`}
            >
              Test Mode
            </button>
            <button
              onClick={() => update('mode', 'live')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                form.mode === 'live'
                  ? 'bg-green-50 text-green-800'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Live Mode
            </button>
          </div>

          {form.mode === 'test' && (
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Test mode</strong> — No real charges will be made. Use Stripe test card numbers.
              </p>
            </div>
          )}
          {form.mode === 'live' && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-800">
                <strong>Live mode</strong> — Real charges will be processed. Double-check your credentials.
              </p>
            </div>
          )}
        </div>

        {/* Test Credentials */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Test Credentials</h2>
          <p className="mb-4 text-xs text-gray-400">
            From your Stripe Dashboard &gt; Developers &gt; API keys (toggle to Test)
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Publishable Key</label>
              <input
                type="text"
                value={form.testPublishableKey}
                onChange={(e) => update('testPublishableKey', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="pk_test_..."
              />
            </div>
            <MaskedInput
              label="Secret Key"
              value={form.testSecretKey}
              onChange={(v) => update('testSecretKey', v)}
              placeholder="sk_test_..."
              helpText="Never share this key. It's stored encrypted on the server."
            />
            <MaskedInput
              label="Webhook Signing Secret"
              value={form.testWebhookSecret}
              onChange={(v) => update('testWebhookSecret', v)}
              placeholder="whsec_..."
            />
          </div>
        </div>

        {/* Live Credentials */}
        <div className="rounded-lg bg-white p-6 shadow border-l-4 border-l-green-500">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Live Credentials</h2>
          <p className="mb-4 text-xs text-gray-400">
            From your Stripe Dashboard &gt; Developers &gt; API keys (toggle to Live)
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Publishable Key</label>
              <input
                type="text"
                value={form.livePublishableKey}
                onChange={(e) => update('livePublishableKey', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="pk_live_..."
              />
            </div>
            <MaskedInput
              label="Secret Key"
              value={form.liveSecretKey}
              onChange={(v) => update('liveSecretKey', v)}
              placeholder="sk_live_..."
              helpText="Never share this key. It's stored encrypted on the server."
            />
            <MaskedInput
              label="Webhook Signing Secret"
              value={form.liveWebhookSecret}
              onChange={(v) => update('liveWebhookSecret', v)}
              placeholder="whsec_..."
            />
          </div>
        </div>

        {/* General Payment Settings */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Payment Options</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capture Method</label>
              <select
                value={form.captureMethod}
                onChange={(e) => update('captureMethod', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="automatic">Automatic (charge immediately)</option>
                <option value="manual">Manual (authorize, capture later)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Statement Descriptor</label>
              <input
                type="text"
                value={form.statementDescriptor}
                onChange={(e) => update('statementDescriptor', e.target.value.toUpperCase().slice(0, 22))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="MYSTORE"
                maxLength={22}
              />
              <p className="mt-1 text-xs text-gray-400">
                Appears on customer bank statements. Max 22 characters, uppercase.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Webhook Configuration</h2>
          <p className="text-xs text-gray-500 mb-3">
            Add this URL in your Stripe Dashboard &gt; Developers &gt; Webhooks &gt; Add endpoint:
          </p>
          <div className="flex items-center gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
            <code className="flex-1 text-xs text-gray-700 font-mono break-all">
              {typeof window !== 'undefined' ? window.location.origin.replace(':3300', ':3003') : 'http://localhost:3003'}/api/v1/webhooks/stripe
            </code>
            <button
              onClick={() => {
                const url = `${window.location.origin.replace(':3300', ':3003')}/api/v1/webhooks/stripe`;
                navigator.clipboard.writeText(url);
                toast.success('Copied to clipboard');
              }}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Events to subscribe: <code className="bg-gray-100 px-1 rounded">payment_intent.succeeded</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">payment_intent.payment_failed</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">charge.refunded</code>
          </p>
        </div>

        {/* Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Connection Status</h2>
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                form.enabled && (form.mode === 'test' ? form.testSecretKey : form.liveSecretKey)
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
            <span className="text-sm text-gray-700">
              {!form.enabled
                ? 'Payments disabled'
                : form.mode === 'test'
                  ? form.testSecretKey
                    ? 'Connected (Test Mode)'
                    : 'Test mode enabled but missing secret key'
                  : form.liveSecretKey
                    ? 'Connected (Live Mode)'
                    : 'Live mode enabled but missing secret key'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
