'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

const CONTENT_API = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:3001';
const COMMERCE_API = process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';
const COURSE_API = process.env.NEXT_PUBLIC_COURSE_API_URL || 'http://localhost:3005';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'checking' | 'online' | 'offline';
  responseTime?: number;
}

interface SystemSettings {
  deploymentMode: string;
  features: {
    mediaStorage: string;
    search: string;
    queue: string;
    cache: string;
  };
  salesforce: {
    enabled: boolean;
    authMethod: 'oauth' | 'jwt';
    clientId: string;
    clientSecret: string;
    privateKey: string;
    username: string;
    loginUrl: string;
    isSandbox: boolean;
  };
}

const DEFAULT_SYSTEM: SystemSettings = {
  deploymentMode: 'standalone',
  features: {
    mediaStorage: 's3',
    search: 'database',
    queue: 'database',
    cache: 'memory',
  },
  salesforce: {
    enabled: false,
    authMethod: 'jwt',
    clientId: '',
    clientSecret: '',
    privateKey: '',
    username: '',
    loginUrl: 'https://login.salesforce.com',
    isSandbox: false,
  },
};

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'system'],
    queryFn: () => settingsApi.get('system'),
  });

  const [form, setForm] = useState<SystemSettings>(DEFAULT_SYSTEM);
  const [dirty, setDirty] = useState(false);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Content Service', url: CONTENT_API, status: 'checking' },
    { name: 'Commerce Service', url: COMMERCE_API, status: 'checking' },
    { name: 'Course Service', url: COURSE_API, status: 'checking' },
  ]);

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULT_SYSTEM,
        ...settings,
        features: { ...DEFAULT_SYSTEM.features, ...settings.features },
        salesforce: { ...DEFAULT_SYSTEM.salesforce, ...settings.salesforce },
      });
      setDirty(false);
    }
  }, [settings]);

  // Check service health on mount
  useEffect(() => {
    checkAllServices();
  }, []);

  async function checkService(service: ServiceStatus): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${service.url}/api/v1/settings/public`, {
        signal: controller.signal,
        mode: 'no-cors',
      });
      clearTimeout(timeout);
      return { ...service, status: 'online', responseTime: Date.now() - start };
    } catch {
      return { ...service, status: 'offline' };
    }
  }

  async function checkAllServices() {
    setServices((prev) => prev.map((s) => ({ ...s, status: 'checking' as const })));
    const results = await Promise.all(services.map(checkService));
    setServices(results);
  }

  const mutation = useMutation({
    mutationFn: (data: SystemSettings) => settingsApi.update('system', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('System settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateFeature = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
    setDirty(true);
  };

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateSalesforce = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      salesforce: { ...prev.salesforce, [key]: value },
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
          <h1 className="text-2xl font-bold text-gray-900">System</h1>
          <p className="mt-1 text-sm text-gray-500">
            Infrastructure status, deployment mode, and feature toggles
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
        {/* Service Health */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Service Health</h2>
            <button
              onClick={checkAllServices}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      svc.status === 'online'
                        ? 'bg-green-500'
                        : svc.status === 'offline'
                          ? 'bg-red-400'
                          : 'bg-gray-300 animate-pulse'
                    }`}
                  />
                  <span className="text-sm text-gray-700">{svc.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-xs text-gray-400">{svc.url}</code>
                  {svc.status === 'online' && svc.responseTime && (
                    <span className="text-xs text-green-600">{svc.responseTime}ms</span>
                  )}
                  {svc.status === 'offline' && (
                    <span className="text-xs text-red-500">Unreachable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Mode */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Deployment Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                mode: 'standalone',
                title: 'Standalone',
                desc: 'Full Docker stack — PostgreSQL, Redis, Elasticsearch, Kafka, MinIO',
              },
              {
                mode: 'shared',
                title: 'Shared Hosting',
                desc: 'Minimal — PostgreSQL only, local file storage, in-memory cache',
              },
            ].map(({ mode, title, desc }) => (
              <button
                key={mode}
                onClick={() => update('deploymentMode', mode)}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  form.deploymentMode === mode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="mt-1 text-xs text-gray-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Configuration */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Feature Backends</h2>
          <p className="mb-4 text-xs text-gray-400">
            Choose which infrastructure each feature uses. Shared hosting mode works without external services.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Media Storage</label>
              <select
                value={form.features.mediaStorage}
                onChange={(e) => updateFeature('mediaStorage', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="s3">S3 / MinIO</option>
                <option value="local">Local Filesystem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search Engine</label>
              <select
                value={form.features.search}
                onChange={(e) => updateFeature('search', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="elasticsearch">Elasticsearch</option>
                <option value="database">PostgreSQL Full-Text Search</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Job Queue</label>
              <select
                value={form.features.queue}
                onChange={(e) => updateFeature('queue', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="kafka">Kafka</option>
                <option value="database">PostgreSQL Polling</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cache</label>
              <select
                value={form.features.cache}
                onChange={(e) => updateFeature('cache', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="redis">Redis</option>
                <option value="memory">In-Memory (LRU)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salesforce Integration */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Salesforce Integration</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Connect to Salesforce to push form submissions as Leads, Contacts, or Cases
              </p>
            </div>
            <button
              onClick={() => updateSalesforce('enabled', !form.salesforce.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.salesforce.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={form.salesforce.enabled}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.salesforce.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {form.salesforce.enabled && (
            <div className="space-y-4">
              {/* Environment */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.salesforce.isSandbox}
                    onChange={(e) => {
                      updateSalesforce('isSandbox', e.target.checked);
                      updateSalesforce('loginUrl', e.target.checked
                        ? 'https://test.salesforce.com'
                        : 'https://login.salesforce.com');
                    }}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Sandbox environment
                </label>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  form.salesforce.isSandbox ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {form.salesforce.isSandbox ? 'Sandbox' : 'Production'}
                </span>
              </div>

              {/* Auth Method */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Authentication Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateSalesforce('authMethod', 'jwt')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.salesforce.authMethod === 'jwt'
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-900">JWT Bearer Flow</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Server-to-server, no user interaction</p>
                  </button>
                  <button
                    onClick={() => updateSalesforce('authMethod', 'oauth')}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.salesforce.authMethod === 'oauth'
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-900">OAuth Client Credentials</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Client ID + secret authentication</p>
                  </button>
                </div>
              </div>

              {/* Credentials */}
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Connected App Client ID</label>
                  <input
                    type="text"
                    value={form.salesforce.clientId}
                    onChange={(e) => updateSalesforce('clientId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="3MVG9..."
                  />
                </div>

                {form.salesforce.authMethod === 'oauth' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={form.salesforce.clientSecret}
                      onChange={(e) => updateSalesforce('clientSecret', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter client secret"
                    />
                  </div>
                )}

                {form.salesforce.authMethod === 'jwt' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Salesforce Username</label>
                      <input
                        type="text"
                        value={form.salesforce.username}
                        onChange={(e) => updateSalesforce('username', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="admin@yourorg.com"
                      />
                      <p className="mt-1 text-[10px] text-gray-400">The integration user that will create records</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Private Key (PEM)</label>
                      <textarea
                        value={form.salesforce.privateKey}
                        onChange={(e) => updateSalesforce('privateKey', e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      />
                      <p className="mt-1 text-[10px] text-gray-400">
                        The private key from your Connected App certificate. Upload the public certificate in Salesforce Setup.
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Login URL</label>
                  <input
                    type="text"
                    value={form.salesforce.loginUrl}
                    onChange={(e) => updateSalesforce('loginUrl', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-[11px] text-blue-700">
                  <strong>Setup steps:</strong> In Salesforce Setup, create a Connected App with OAuth enabled.
                  {form.salesforce.authMethod === 'jwt'
                    ? ' Enable "Use digital signatures" and upload your certificate. Pre-authorize the Connected App for your integration user\'s profile.'
                    : ' Enable "Client Credentials Flow" and assign the app to your integration user.'}
                  {' '}Map form fields to Salesforce fields in each form&apos;s Salesforce tab.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* API Endpoints (read-only reference) */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">API Endpoints</h2>
          <div className="space-y-2 text-sm">
            {[
              { name: 'Content Service', url: CONTENT_API },
              { name: 'Commerce Service', url: COMMERCE_API },
              { name: 'Course Service', url: COURSE_API },
              { name: 'Integration Service', url: 'http://localhost:3003' },
              { name: 'Shipping Gateway', url: 'http://localhost:3004' },
            ].map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2"
              >
                <span className="text-gray-600">{svc.name}</span>
                <code className="text-xs text-gray-500">{svc.url}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure (read-only) */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Infrastructure</h2>
          <div className="space-y-2 text-sm">
            {[
              { name: 'PostgreSQL', port: 5432, required: true },
              { name: 'Redis', port: 6379, required: false },
              { name: 'Elasticsearch', port: 9200, required: false },
              { name: 'Kafka', port: 9092, required: false },
              { name: 'MinIO (S3)', port: 9000, required: false },
            ].map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{svc.name}</span>
                  {svc.required ? (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                      Required
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      Optional
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">:{svc.port}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
