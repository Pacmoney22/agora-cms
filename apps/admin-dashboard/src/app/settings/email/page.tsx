'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

// ── Provider Definitions ──

interface ProviderDef {
  key: string;
  label: string;
  description: string;
  fields: ProviderField[];
  docsUrl: string;
}

interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select';
  placeholder: string;
  helpText?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const PROVIDERS: ProviderDef[] = [
  {
    key: 'smtp',
    label: 'SMTP',
    description: 'Connect to any SMTP server (Gmail, Outlook, custom mail server, etc.)',
    docsUrl: 'https://nodemailer.com/smtp/',
    fields: [
      { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '587', required: true, helpText: 'Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)' },
      {
        key: 'encryption', label: 'Encryption', type: 'select', placeholder: '',
        options: [
          { value: 'tls', label: 'TLS (recommended, port 587)' },
          { value: 'ssl', label: 'SSL (port 465)' },
          { value: 'none', label: 'None (port 25, not recommended)' },
        ],
      },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'your@email.com', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'App password or SMTP password', required: true, helpText: 'For Gmail, use an App Password instead of your account password' },
    ],
  },
  {
    key: 'sendgrid',
    label: 'SendGrid',
    description: 'Scalable email delivery with analytics and deliverability tools',
    docsUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxxxx...', required: true, helpText: 'Create an API key at Settings > API Keys in your SendGrid dashboard' },
    ],
  },
  {
    key: 'mailgun',
    label: 'Mailgun',
    description: 'Developer-friendly email API with powerful routing and validation',
    docsUrl: 'https://documentation.mailgun.com/en/latest/quickstart-sending.html',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'key-xxxxx...', required: true },
      { key: 'domain', label: 'Sending Domain', type: 'text', placeholder: 'mg.example.com', required: true, helpText: 'The verified domain you configured in Mailgun' },
      {
        key: 'region', label: 'Region', type: 'select', placeholder: '',
        options: [
          { value: 'us', label: 'US (api.mailgun.net)' },
          { value: 'eu', label: 'EU (api.eu.mailgun.net)' },
        ],
      },
    ],
  },
  {
    key: 'ses',
    label: 'Amazon SES',
    description: 'Cost-effective email at scale through AWS Simple Email Service',
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'Your AWS access key ID', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'Your AWS secret access key', required: true },
      {
        key: 'region', label: 'AWS Region', type: 'select', placeholder: '',
        options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-east-2', label: 'US East (Ohio)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'EU (Ireland)' },
          { value: 'eu-central-1', label: 'EU (Frankfurt)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
          { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
        ],
      },
    ],
  },
  {
    key: 'postmark',
    label: 'Postmark',
    description: 'Fast, reliable transactional email with exceptional deliverability',
    docsUrl: 'https://postmarkapp.com/developer/api/overview',
    fields: [
      { key: 'serverToken', label: 'Server API Token', type: 'password', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, helpText: 'Found at Servers > Your Server > API Tokens' },
    ],
  },
  {
    key: 'resend',
    label: 'Resend',
    description: 'Modern email API built for developers with React email support',
    docsUrl: 'https://resend.com/docs/send-with-nodejs',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_xxxxx...', required: true, helpText: 'Create an API key at resend.com/api-keys' },
    ],
  },
];

interface EmailSettings {
  enabled: boolean;
  provider: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  credentials: Record<string, string>;
  rateLimitPerHour: number;
  testMode: boolean;
  testRecipient: string;
}

const DEFAULTS: EmailSettings = {
  enabled: false,
  provider: 'smtp',
  fromName: '',
  fromEmail: '',
  replyToEmail: '',
  credentials: {},
  rateLimitPerHour: 500,
  testMode: false,
  testRecipient: '',
};

// ── Masked Input ──

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
  const isMasked = value.includes('****');

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

// ── Page ──

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'email'],
    queryFn: () => settingsApi.get('email'),
  });

  const [form, setForm] = useState<EmailSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULTS, ...settings, credentials: { ...DEFAULTS.credentials, ...settings.credentials } });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: EmailSettings) => settingsApi.update('email', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Email settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateCred = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value },
    }));
    setDirty(true);
  };

  const selectedProvider = PROVIDERS.find((p) => p.key === form.provider);

  const handleProviderChange = (key: string) => {
    setForm((prev) => ({ ...prev, provider: key, credentials: {} }));
    setDirty(true);
  };

  const sendTestEmail = async () => {
    if (!form.fromEmail || !form.testRecipient) {
      toast.error('Set both "From Email" and a test recipient');
      return;
    }
    setTestSending(true);
    try {
      await settingsApi.update('email', form as any);
      await settingsApi.get('email/test');
      toast.success(`Test email sent to ${form.testRecipient}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  };

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

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
          <h1 className="text-2xl font-bold text-gray-900">Email Delivery</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure how transactional emails are sent from your site
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
        {/* Enable / Test Mode */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Email Sending</h2>
              <p className="text-xs text-gray-500 mt-1">
                Enable outgoing transactional emails (registration, password resets, orders, etc.)
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

          {!form.enabled && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                Email sending is disabled. No transactional emails will be sent. Enable this when your provider credentials are configured.
              </p>
            </div>
          )}

          {form.enabled && (
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={(e) => update('testMode', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Test mode</span>
              </label>
              {form.testMode && (
                <div className="flex-1">
                  <input
                    type="email"
                    value={form.testRecipient}
                    onChange={(e) => update('testRecipient', e.target.value)}
                    className={inputCls}
                    placeholder="All emails redirect to this address..."
                  />
                </div>
              )}
            </div>
          )}

          {form.testMode && form.enabled && (
            <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                <strong>Test mode active</strong> &mdash; All transactional emails will be sent to <strong>{form.testRecipient || '(set recipient above)'}</strong> instead of the actual recipients.
              </p>
            </div>
          )}
        </div>

        {/* Sender Identity */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Sender Identity</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>From Name *</label>
                <input
                  type="text"
                  value={form.fromName}
                  onChange={(e) => update('fromName', e.target.value)}
                  className={inputCls}
                  placeholder="My Website"
                />
                <p className="mt-1 text-xs text-gray-400">The name recipients see in their inbox</p>
              </div>
              <div>
                <label className={labelCls}>From Email *</label>
                <input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => update('fromEmail', e.target.value)}
                  className={inputCls}
                  placeholder="noreply@example.com"
                />
                <p className="mt-1 text-xs text-gray-400">Must be verified with your email provider</p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Reply-To Email</label>
              <input
                type="email"
                value={form.replyToEmail}
                onChange={(e) => update('replyToEmail', e.target.value)}
                className={inputCls}
                placeholder="support@example.com"
              />
              <p className="mt-1 text-xs text-gray-400">
                Where replies go (optional). If blank, replies go to the From Email address.
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Email Provider</h2>
          <div className="grid grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleProviderChange(p.key)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  form.provider === p.key
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-semibold ${form.provider === p.key ? 'text-blue-700' : 'text-gray-900'}`}>
                  {p.label}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Provider Credentials */}
        {selectedProvider && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{selectedProvider.label} Configuration</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedProvider.description}</p>
              </div>
              <a
                href={selectedProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View docs &rarr;
              </a>
            </div>
            <div className="space-y-4">
              {selectedProvider.fields.map((field) => {
                if (field.type === 'password') {
                  return (
                    <MaskedInput
                      key={field.key}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      value={form.credentials[field.key] || ''}
                      onChange={(v) => updateCred(field.key, v)}
                      placeholder={field.placeholder}
                      helpText={field.helpText}
                    />
                  );
                }
                if (field.type === 'select') {
                  return (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label}{field.required ? ' *' : ''}</label>
                      <select
                        value={form.credentials[field.key] || (field.options?.[0]?.value ?? '')}
                        onChange={(e) => updateCred(field.key, e.target.value)}
                        className={inputCls}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {field.helpText && <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>}
                    </div>
                  );
                }
                return (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}{field.required ? ' *' : ''}</label>
                    <input
                      type={field.type}
                      value={form.credentials[field.key] || ''}
                      onChange={(e) => updateCred(field.key, e.target.value)}
                      className={inputCls}
                      placeholder={field.placeholder}
                    />
                    {field.helpText && <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rate Limiting */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Delivery Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Rate Limit (per hour)</label>
              <input
                type="number"
                value={form.rateLimitPerHour}
                onChange={(e) => update('rateLimitPerHour', parseInt(e.target.value) || 0)}
                className={inputCls}
                min={0}
                max={10000}
              />
              <p className="mt-1 text-xs text-gray-400">
                Maximum emails sent per hour. Set to 0 for unlimited. Check your provider's limits.
              </p>
            </div>
            <div className="flex items-end pb-1">
              <div className="text-xs text-gray-500 space-y-1">
                <p>Typical provider limits:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>SendGrid Free: 100/day</li>
                  <li>Mailgun Free: 300/day</li>
                  <li>Amazon SES: 200/day (sandbox)</li>
                  <li>Postmark Free: 100/month</li>
                  <li>Resend Free: 100/day</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Test */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Test Connection</h2>
          <p className="text-xs text-gray-500 mb-4">
            Send a test email to verify your configuration is working correctly. Make sure to save your settings first.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className={labelCls}>Test Recipient</label>
              <input
                type="email"
                value={form.testRecipient}
                onChange={(e) => update('testRecipient', e.target.value)}
                className={inputCls}
                placeholder="your@email.com"
              />
            </div>
            <button
              onClick={sendTestEmail}
              disabled={testSending || !form.fromEmail || !form.testRecipient}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSending ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Status</h2>
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                form.enabled && form.fromEmail && selectedProvider && hasRequiredFields()
                  ? 'bg-green-500'
                  : form.enabled
                    ? 'bg-amber-400'
                    : 'bg-gray-300'
              }`}
            />
            <span className="text-sm text-gray-700">
              {!form.enabled
                ? 'Email delivery disabled'
                : !form.fromEmail
                  ? 'Missing sender email address'
                  : !hasRequiredFields()
                    ? `Missing required ${selectedProvider?.label || 'provider'} credentials`
                    : form.testMode
                      ? `Configured (Test mode \u2014 all emails go to ${form.testRecipient || '...'})`
                      : `Connected via ${selectedProvider?.label || form.provider}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  function hasRequiredFields(): boolean {
    if (!selectedProvider) return false;
    return selectedProvider.fields
      .filter((f) => f.required)
      .every((f) => (form.credentials[f.key] || '').trim() !== '');
  }
}
