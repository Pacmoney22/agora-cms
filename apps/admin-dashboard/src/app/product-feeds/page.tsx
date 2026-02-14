'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

// ── Types ──

interface FeedFieldMapping {
  feedField: string;
  sourceField: string;
  defaultValue: string;
  transform: string;
}

interface ProductFeed {
  id: string;
  name: string;
  platform: 'google' | 'facebook' | 'pinterest' | 'tiktok' | 'bing' | 'custom';
  enabled: boolean;
  format: 'xml' | 'csv' | 'tsv';
  feedUrl: string;
  schedule: 'hourly' | 'daily' | 'weekly' | 'manual';
  includeOutOfStock: boolean;
  includeVariants: boolean;
  productFilter: 'all' | 'published' | 'in_stock';
  categoryMapping: boolean;
  currency: string;
  fieldMappings: FeedFieldMapping[];
  lastGenerated: string;
  itemCount: number;
}

interface ProductFeedsSettings {
  feeds: ProductFeed[];
  globalDefaults: {
    brand: string;
    condition: 'new' | 'refurbished' | 'used';
    shipping: string;
    taxIncluded: boolean;
    identifierExists: boolean;
  };
}

// ── Platform configs ──

const PLATFORMS: Record<string, { label: string; color: string; icon: string; description: string; defaultFormat: 'xml' | 'csv' | 'tsv' }> = {
  google: { label: 'Google Merchant Center', color: 'bg-blue-100 text-blue-700', icon: 'G', description: 'Google Shopping, Performance Max campaigns', defaultFormat: 'xml' },
  facebook: { label: 'Meta Commerce', color: 'bg-indigo-100 text-indigo-700', icon: 'f', description: 'Facebook & Instagram Shops, Dynamic Ads', defaultFormat: 'csv' },
  pinterest: { label: 'Pinterest Catalogs', color: 'bg-red-100 text-red-700', icon: 'P', description: 'Shopping pins and product catalogs', defaultFormat: 'csv' },
  tiktok: { label: 'TikTok Shop', color: 'bg-gray-900 text-white', icon: 'T', description: 'TikTok catalog and shop integration', defaultFormat: 'csv' },
  bing: { label: 'Microsoft Merchant Center', color: 'bg-cyan-100 text-cyan-700', icon: 'B', description: 'Bing Shopping campaigns', defaultFormat: 'xml' },
  custom: { label: 'Custom Feed', color: 'bg-gray-100 text-gray-700', icon: '{}', description: 'Custom XML/CSV feed for any platform', defaultFormat: 'csv' },
};

const GOOGLE_FIELDS: FeedFieldMapping[] = [
  { feedField: 'id', sourceField: 'id', defaultValue: '', transform: '' },
  { feedField: 'title', sourceField: 'name', defaultValue: '', transform: '' },
  { feedField: 'description', sourceField: 'description', defaultValue: '', transform: 'strip_html' },
  { feedField: 'link', sourceField: 'url', defaultValue: '', transform: '' },
  { feedField: 'image_link', sourceField: 'images[0]', defaultValue: '', transform: '' },
  { feedField: 'price', sourceField: 'price', defaultValue: '', transform: 'currency' },
  { feedField: 'sale_price', sourceField: 'salePrice', defaultValue: '', transform: 'currency' },
  { feedField: 'availability', sourceField: 'stockQuantity', defaultValue: 'in_stock', transform: 'stock_to_availability' },
  { feedField: 'brand', sourceField: '', defaultValue: '', transform: '' },
  { feedField: 'gtin', sourceField: 'gtin', defaultValue: '', transform: '' },
  { feedField: 'mpn', sourceField: 'sku', defaultValue: '', transform: '' },
  { feedField: 'condition', sourceField: '', defaultValue: 'new', transform: '' },
  { feedField: 'product_type', sourceField: 'category', defaultValue: '', transform: '' },
  { feedField: 'google_product_category', sourceField: '', defaultValue: '', transform: '' },
  { feedField: 'shipping_weight', sourceField: 'weight', defaultValue: '', transform: '' },
];

const FACEBOOK_FIELDS: FeedFieldMapping[] = [
  { feedField: 'id', sourceField: 'id', defaultValue: '', transform: '' },
  { feedField: 'title', sourceField: 'name', defaultValue: '', transform: '' },
  { feedField: 'description', sourceField: 'description', defaultValue: '', transform: 'strip_html' },
  { feedField: 'availability', sourceField: 'stockQuantity', defaultValue: 'in stock', transform: 'stock_to_availability' },
  { feedField: 'condition', sourceField: '', defaultValue: 'new', transform: '' },
  { feedField: 'price', sourceField: 'price', defaultValue: '', transform: 'currency' },
  { feedField: 'link', sourceField: 'url', defaultValue: '', transform: '' },
  { feedField: 'image_link', sourceField: 'images[0]', defaultValue: '', transform: '' },
  { feedField: 'brand', sourceField: '', defaultValue: '', transform: '' },
  { feedField: 'sale_price', sourceField: 'salePrice', defaultValue: '', transform: 'currency' },
  { feedField: 'product_type', sourceField: 'category', defaultValue: '', transform: '' },
];

const DEFAULT_SETTINGS: ProductFeedsSettings = {
  feeds: [],
  globalDefaults: {
    brand: '',
    condition: 'new',
    shipping: '',
    taxIncluded: false,
    identifierExists: true,
  },
};

const SOURCE_FIELDS = [
  'id', 'name', 'slug', 'description', 'shortDescription', 'sku', 'gtin', 'price', 'salePrice',
  'compareAtPrice', 'category', 'tags', 'images[0]', 'images', 'url', 'stockQuantity', 'weight',
  'dimensions', 'status', 'productType', 'vendor', 'barcode',
];

// ── Component ──

export default function ProductFeedsPage() {
  const queryClient = useQueryClient();
  const [editingFeed, setEditingFeed] = useState<ProductFeed | null>(null);
  const [showGlobals, setShowGlobals] = useState(false);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'fields'>('general');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings', 'product_feeds'],
    queryFn: () => settingsApi.get('product_feeds').catch(() => DEFAULT_SETTINGS),
  });

  const settings: ProductFeedsSettings = { ...DEFAULT_SETTINGS, ...settingsData };

  const [globals, setGlobals] = useState(settings.globalDefaults);
  const [globalsDirty, setGlobalsDirty] = useState(false);

  useEffect(() => {
    if (settingsData?.globalDefaults) {
      setGlobals({ ...DEFAULT_SETTINGS.globalDefaults, ...settingsData.globalDefaults });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (data: ProductFeedsSettings) => settingsApi.update('product_feeds', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'product_feeds'] });
      toast.success('Feed settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Helpers ──

  const addFeed = (platform: string) => {
    const config = PLATFORMS[platform];
    if (!config) return;
    const id = crypto.randomUUID();
    const defaultMappings = platform === 'google' ? GOOGLE_FIELDS
      : platform === 'facebook' ? FACEBOOK_FIELDS
      : GOOGLE_FIELDS.slice(0, 8);

    const feed: ProductFeed = {
      id,
      name: config.label,
      platform: platform as ProductFeed['platform'],
      enabled: false,
      format: config.defaultFormat,
      feedUrl: `/feeds/${platform}-${id.slice(0, 8)}.${config.defaultFormat}`,
      schedule: 'daily',
      includeOutOfStock: false,
      includeVariants: true,
      productFilter: 'published',
      categoryMapping: false,
      currency: 'USD',
      fieldMappings: defaultMappings.map((m) => ({ ...m })),
      lastGenerated: '',
      itemCount: 0,
    };

    const updated = { ...settings, feeds: [...settings.feeds, feed] };
    saveMutation.mutate(updated);
    setShowAddPlatform(false);
  };

  const deleteFeed = (id: string) => {
    if (!confirm('Delete this product feed?')) return;
    const updated = { ...settings, feeds: settings.feeds.filter((f) => f.id !== id) };
    saveMutation.mutate(updated);
  };

  const toggleFeed = (id: string) => {
    const updated = {
      ...settings,
      feeds: settings.feeds.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    };
    saveMutation.mutate(updated);
  };

  const saveFeed = () => {
    if (!editingFeed) return;
    const updated = {
      ...settings,
      feeds: settings.feeds.map((f) => (f.id === editingFeed.id ? editingFeed : f)),
    };
    saveMutation.mutate(updated);
    setEditingFeed(null);
  };

  const saveGlobals = () => {
    const updated = { ...settings, globalDefaults: globals };
    saveMutation.mutate(updated);
    setGlobalsDirty(false);
  };

  const updateFeed = (patch: Partial<ProductFeed>) => {
    if (!editingFeed) return;
    setEditingFeed({ ...editingFeed, ...patch });
  };

  const updateMapping = (index: number, key: keyof FeedFieldMapping, value: string) => {
    if (!editingFeed) return;
    const mappings = [...editingFeed.fieldMappings];
    mappings[index] = { ...(mappings[index] ?? { feedField: '', sourceField: '', defaultValue: '', transform: '' }), [key]: value };
    setEditingFeed({ ...editingFeed, fieldMappings: mappings });
  };

  const addMapping = () => {
    if (!editingFeed) return;
    setEditingFeed({
      ...editingFeed,
      fieldMappings: [...editingFeed.fieldMappings, { feedField: '', sourceField: '', defaultValue: '', transform: '' }],
    });
  };

  const removeMapping = (index: number) => {
    if (!editingFeed) return;
    const mappings = editingFeed.fieldMappings.filter((_, i) => i !== index);
    setEditingFeed({ ...editingFeed, fieldMappings: mappings });
  };

  // ── Feed Editor View ──

  if (editingFeed) {
    const platformConfig = PLATFORMS[editingFeed.platform];
    if (!platformConfig) return null;

    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => setEditingFeed(null)} className="text-xs text-blue-600 hover:text-blue-800 mb-1">
              &larr; Back to Feeds
            </button>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${platformConfig.color}`}>
                {platformConfig.icon}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{editingFeed.name}</h1>
            </div>
          </div>
          <button
            onClick={saveFeed}
            disabled={saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Feed'}
          </button>
        </div>

        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {(['general', 'fields'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'general' ? 'General' : 'Field Mapping'}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feed Name</label>
                  <input
                    type="text"
                    value={editingFeed.name}
                    onChange={(e) => updateFeed({ name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feed Format</label>
                  <select
                    value={editingFeed.format}
                    onChange={(e) => updateFeed({ format: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="xml">XML (Google Merchant)</option>
                    <option value="csv">CSV</option>
                    <option value="tsv">TSV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Feed URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingFeed.feedUrl}
                    onChange={(e) => updateFeed({ feedUrl: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}${editingFeed.feedUrl}`,
                      );
                      toast.success('Feed URL copied');
                    }}
                    className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  Submit this URL to {platformConfig.label}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Refresh Schedule</label>
                  <select
                    value={editingFeed.schedule}
                    onChange={(e) => updateFeed({ schedule: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="hourly">Every hour</option>
                    <option value="daily">Once daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={editingFeed.currency}
                    onChange={(e) => updateFeed({ currency: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product Filter</label>
                <select
                  value={editingFeed.productFilter}
                  onChange={(e) => updateFeed({ productFilter: e.target.value as any })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All products</option>
                  <option value="published">Published products only</option>
                  <option value="in_stock">In-stock products only</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFeed.includeVariants}
                    onChange={(e) => updateFeed({ includeVariants: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Include product variants as separate items
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFeed.includeOutOfStock}
                    onChange={(e) => updateFeed({ includeOutOfStock: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Include out-of-stock products (marked as unavailable)
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingFeed.categoryMapping}
                    onChange={(e) => updateFeed({ categoryMapping: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Map store categories to platform taxonomy
                </label>
              </div>
            </div>

            {editingFeed.lastGenerated && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Last generated: {new Date(editingFeed.lastGenerated).toLocaleString()} &mdash; {editingFeed.itemCount} items
                </span>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  Regenerate Now
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600">
                  Map your product data to {platformConfig.label} feed fields
                </p>
                <button
                  onClick={addMapping}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Add Field
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 w-1/4">Feed Field</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 w-1/4">Source Field</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 w-1/5">Default Value</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 w-1/5">Transform</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {editingFeed.fieldMappings.map((mapping, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={mapping.feedField}
                          onChange={(e) => updateMapping(i, 'feedField', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
                          placeholder="feed_field"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={mapping.sourceField}
                          onChange={(e) => updateMapping(i, 'sourceField', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">— none —</option>
                          {SOURCE_FIELDS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={mapping.defaultValue}
                          onChange={(e) => updateMapping(i, 'defaultValue', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="fallback"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={mapping.transform}
                          onChange={(e) => updateMapping(i, 'transform', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">None</option>
                          <option value="strip_html">Strip HTML</option>
                          <option value="currency">Format as currency</option>
                          <option value="stock_to_availability">Stock to availability</option>
                          <option value="truncate_150">Truncate to 150 chars</option>
                          <option value="truncate_500">Truncate to 500 chars</option>
                          <option value="uppercase">Uppercase</option>
                          <option value="lowercase">Lowercase</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeMapping(i)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {editingFeed.fieldMappings.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-gray-400">No field mappings. Click &ldquo;Add Field&rdquo; to create one.</p>
                </div>
              )}
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-[11px] text-blue-700">
                <strong>Tip:</strong> Required fields vary by platform. Google requires: id, title, description, link, image_link, price, availability.
                Facebook requires: id, title, description, availability, condition, price, link, image_link, brand.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Global Defaults View ──

  if (showGlobals) {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => setShowGlobals(false)} className="text-xs text-blue-600 hover:text-blue-800 mb-1">
              &larr; Back to Feeds
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Feed Defaults</h1>
            <p className="mt-1 text-sm text-gray-500">
              Global default values applied across all product feeds
            </p>
          </div>
          <button
            onClick={saveGlobals}
            disabled={!globalsDirty || saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>

        <div className="max-w-2xl rounded-lg bg-white p-6 shadow space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Brand</label>
            <input
              type="text"
              value={globals.brand}
              onChange={(e) => { setGlobals({ ...globals, brand: e.target.value }); setGlobalsDirty(true); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Your brand name"
            />
            <p className="mt-1 text-[10px] text-gray-400">Used when a product doesn&apos;t have its own brand field</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Condition</label>
            <select
              value={globals.condition}
              onChange={(e) => { setGlobals({ ...globals, condition: e.target.value as any }); setGlobalsDirty(true); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Shipping Label</label>
            <input
              type="text"
              value={globals.shipping}
              onChange={(e) => { setGlobals({ ...globals, shipping: e.target.value }); setGlobalsDirty(true); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="US::Standard:4.99 USD"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              Format: country::service:price currency (e.g., US::Standard:4.99 USD)
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={globals.taxIncluded}
                onChange={(e) => { setGlobals({ ...globals, taxIncluded: e.target.checked }); setGlobalsDirty(true); }}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Prices include tax
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={globals.identifierExists}
                onChange={(e) => { setGlobals({ ...globals, identifierExists: e.target.checked }); setGlobalsDirty(true); }}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Products have unique identifiers (GTIN, MPN, or brand)
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ── Feed List View ──

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Feeds</h1>
          <p className="mt-1 text-sm text-gray-500">
            Syndicate your product catalog to Google, Facebook, Pinterest, and other platforms
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGlobals(true)}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Feed Defaults
          </button>
          <button
            onClick={() => setShowAddPlatform(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Feed
          </button>
        </div>
      </div>

      {/* Feed Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : settings.feeds.length === 0 ? (
        <div className="rounded-lg bg-white shadow py-16 text-center">
          <p className="text-sm text-gray-400 mb-3">No product feeds configured yet</p>
          <button
            onClick={() => setShowAddPlatform(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Your First Feed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.feeds.map((feed) => {
            const config = PLATFORMS[feed.platform];
            if (!config) return null;
            return (
              <div key={feed.id} className="rounded-lg bg-white p-5 shadow flex items-center gap-4">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${config.color}`}>
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{feed.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      feed.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {feed.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {feed.format.toUpperCase()} &middot; {feed.schedule} &middot; {feed.fieldMappings.length} fields
                    {feed.lastGenerated && ` · ${feed.itemCount} items`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeed(feed.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      feed.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    role="switch"
                    aria-checked={feed.enabled}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                      feed.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <button
                    onClick={() => { setEditingFeed({ ...feed }); setActiveTab('general'); }}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Configure
                  </button>
                  <button
                    onClick={() => deleteFeed(feed.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Platform Modal */}
      {showAddPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Add Product Feed</h2>
            <p className="text-xs text-gray-400 mb-5">Choose a platform to create a new product feed</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PLATFORMS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => addFeed(key)}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded text-xs font-bold shrink-0 ${config.color}`}>
                    {config.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{config.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{config.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAddPlatform(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
