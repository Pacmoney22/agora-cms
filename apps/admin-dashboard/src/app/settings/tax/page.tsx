'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

interface TaxRate {
  id: string;
  name: string;
  rate: string;        // percentage
  country: string;
  state: string;       // empty = applies to entire country
  postalCodes: string; // comma-separated, empty = all
  priority: number;
  compound: boolean;
  shipping: boolean;   // whether tax applies to shipping
}

interface TaxCategory {
  id: string;
  name: string;
  description: string;
  rate: string; // override rate for this category, empty = use default
}

interface NexusRegion {
  country: string;
  state: string;
  enabled: boolean;
}

interface TaxSettings {
  enabled: boolean;
  calculationMethod: 'manual' | 'stripe' | 'automatic';
  automaticProvider: 'none' | 'taxjar' | 'avalara';
  apiKey: string;
  stripeProductTaxCode: string;   // default Stripe tax code, e.g., 'txcd_99999999' for general
  pricesIncludeTax: boolean;
  displayPricesInShop: 'excluding' | 'including';
  displayPricesInCart: 'excluding' | 'including';
  roundAtSubtotal: boolean;
  defaultRate: string;
  taxShipping: boolean;
  taxDigitalGoods: boolean;
  digitalGoodsRate: string;
  nexusRegions: NexusRegion[];
  rates: TaxRate[];
  categories: TaxCategory[];
  taxIdLabel: string;      // e.g., "VAT Number", "GST Number", "Tax ID"
  showTaxId: boolean;
  businessTaxId: string;
}

const DEFAULT_TAX: TaxSettings = {
  enabled: true,
  calculationMethod: 'manual',
  automaticProvider: 'none',
  apiKey: '',
  stripeProductTaxCode: 'txcd_99999999',
  pricesIncludeTax: false,
  displayPricesInShop: 'excluding',
  displayPricesInCart: 'excluding',
  roundAtSubtotal: false,
  defaultRate: '0',
  taxShipping: false,
  taxDigitalGoods: true,
  digitalGoodsRate: '',
  nexusRegions: [],
  rates: [],
  categories: [],
  taxIdLabel: 'Tax ID',
  showTaxId: false,
  businessTaxId: '',
};

function genId() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

export default function TaxSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'tax'],
    queryFn: () => settingsApi.get('tax'),
  });

  const [form, setForm] = useState<TaxSettings>(DEFAULT_TAX);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'rates' | 'nexus' | 'categories'>('general');

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULT_TAX, ...settings });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: TaxSettings) => settingsApi.update('tax', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Tax settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Tax rates
  const addRate = () => {
    const rate: TaxRate = {
      id: genId(), name: 'Sales Tax', rate: '', country: 'US', state: '',
      postalCodes: '', priority: 1, compound: false, shipping: form.taxShipping,
    };
    setForm((prev) => ({ ...prev, rates: [...prev.rates, rate] }));
    setDirty(true);
  };

  const removeRate = (id: string) => {
    setForm((prev) => ({ ...prev, rates: prev.rates.filter((r) => r.id !== id) }));
    setDirty(true);
  };

  const updateRate = (id: string, updates: Partial<TaxRate>) => {
    setForm((prev) => ({
      ...prev,
      rates: prev.rates.map((r) => r.id === id ? { ...r, ...updates } : r),
    }));
    setDirty(true);
  };

  // Tax categories
  const addCategory = () => {
    const cat: TaxCategory = { id: genId(), name: '', description: '', rate: '' };
    setForm((prev) => ({ ...prev, categories: [...prev.categories, cat] }));
    setDirty(true);
  };

  const removeCategory = (id: string) => {
    setForm((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
    setDirty(true);
  };

  const updateCategory = (id: string, updates: Partial<TaxCategory>) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => c.id === id ? { ...c, ...updates } : c),
    }));
    setDirty(true);
  };

  // Nexus regions
  const toggleNexusState = (stateCode: string) => {
    setForm((prev) => {
      const existing = prev.nexusRegions.find((n) => n.state === stateCode && n.country === 'US');
      if (existing) {
        return { ...prev, nexusRegions: prev.nexusRegions.filter((n) => !(n.state === stateCode && n.country === 'US')) };
      }
      return { ...prev, nexusRegions: [...prev.nexusRegions, { country: 'US', state: stateCode, enabled: true }] };
    });
    setDirty(true);
  };

  const selectAllNexus = () => {
    setForm((prev) => ({
      ...prev,
      nexusRegions: US_STATES.map((s) => ({ country: 'US', state: s.code, enabled: true })),
    }));
    setDirty(true);
  };

  const clearAllNexus = () => {
    setForm((prev) => ({ ...prev, nexusRegions: [] }));
    setDirty(true);
  };

  const isNexusState = (code: string) =>
    form.nexusRegions.some((n) => n.state === code && n.country === 'US');

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

  const tabs = [
    { key: 'general' as const, label: 'General' },
    { key: 'rates' as const, label: `Tax Rates (${form.rates.length})` },
    { key: 'nexus' as const, label: `Nexus (${form.nexusRegions.length})` },
    { key: 'categories' as const, label: `Categories (${form.categories.length})` },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure tax calculation, rates, and collection rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!dirty || mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl space-y-6">
        {/* ── General Tab ── */}
        {activeTab === 'general' && (
          <>
            {/* Enable + Calculation Method */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Tax Collection</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Enable or disable tax calculation for your store</p>
                </div>
                <button
                  onClick={() => update('enabled', !form.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={form.enabled}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Calculation Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => update('calculationMethod', 'stripe')}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        form.calculationMethod === 'stripe'
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">Stripe Tax</p>
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">Recommended</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Automatic rates via your Stripe account</p>
                    </button>
                    <button
                      onClick={() => update('calculationMethod', 'manual')}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        form.calculationMethod === 'manual'
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">Manual Rates</p>
                      <p className="mt-1 text-xs text-gray-500">Define tax rates yourself per state/region</p>
                    </button>
                    <button
                      onClick={() => update('calculationMethod', 'automatic')}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        form.calculationMethod === 'automatic'
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">Other Provider</p>
                      <p className="mt-1 text-xs text-gray-500">TaxJar or Avalara for real-time rates</p>
                    </button>
                  </div>
                </div>

                {form.calculationMethod === 'stripe' && (
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="currentColor"/>
                        </svg>
                        <h3 className="text-sm font-semibold text-purple-900">Stripe Tax</h3>
                      </div>
                      <p className="text-xs text-purple-700">
                        Uses your existing Stripe credentials (configured in Settings &rarr; Payments) to automatically
                        calculate sales tax, VAT, and GST across 100+ countries and all US states.
                      </p>
                    </div>
                    <div className="rounded-md bg-white/60 p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Default Product Tax Code</label>
                        <select
                          value={form.stripeProductTaxCode}
                          onChange={(e) => update('stripeProductTaxCode', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="txcd_99999999">General - Tangible Goods</option>
                          <option value="txcd_10000000">General - Services</option>
                          <option value="txcd_10501000">Software as a Service (SaaS)</option>
                          <option value="txcd_10201000">Digital Goods - General</option>
                          <option value="txcd_10202000">Digital Goods - eBooks</option>
                          <option value="txcd_10103001">Digital Goods - Streaming (Video)</option>
                          <option value="txcd_10103002">Digital Goods - Streaming (Music)</option>
                          <option value="txcd_20030000">Clothing</option>
                          <option value="txcd_40060000">Food & Beverages</option>
                          <option value="txcd_37060001">Online Courses / Training</option>
                        </select>
                        <p className="mt-1 text-[10px] text-gray-400">
                          Applied when a product doesn&apos;t have its own tax code.{' '}
                          <a href="https://stripe.com/docs/tax/tax-codes" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                            View all Stripe tax codes
                          </a>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-purple-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      <p>
                        Stripe Tax automatically handles nexus tracking, threshold monitoring, and filing-ready reports.
                        Tax rates, nexus configuration, and product categories set in the other tabs will be used as
                        fallbacks if the Stripe API is unavailable.
                      </p>
                    </div>
                  </div>
                )}

                {form.calculationMethod === 'automatic' && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tax Provider</label>
                      <select
                        value={form.automaticProvider}
                        onChange={(e) => update('automaticProvider', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="none">Select a provider...</option>
                        <option value="taxjar">TaxJar</option>
                        <option value="avalara">Avalara AvaTax</option>
                      </select>
                    </div>
                    {form.automaticProvider !== 'none' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                        <input
                          type="password"
                          value={form.apiKey}
                          onChange={(e) => update('apiKey', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`Enter your ${form.automaticProvider === 'taxjar' ? 'TaxJar' : 'Avalara'} API key`}
                        />
                        <p className="mt-1 text-[10px] text-gray-400">
                          {form.automaticProvider === 'taxjar'
                            ? 'Get your API key from TaxJar Dashboard → Account → API'
                            : 'Get your API key from Avalara Admin Console → Settings → License Keys'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Price Display */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Price Display</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.pricesIncludeTax}
                    onChange={(e) => update('pricesIncludeTax', e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Prices entered with tax</label>
                    <p className="mt-0.5 text-[10px] text-gray-400">Product prices are entered inclusive of tax (common in EU/UK)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Display prices in shop</label>
                    <select
                      value={form.displayPricesInShop}
                      onChange={(e) => update('displayPricesInShop', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="excluding">Excluding tax</option>
                      <option value="including">Including tax</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Display prices in cart/checkout</label>
                    <select
                      value={form.displayPricesInCart}
                      onChange={(e) => update('displayPricesInCart', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="excluding">Excluding tax</option>
                      <option value="including">Including tax</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.roundAtSubtotal}
                    onChange={(e) => update('roundAtSubtotal', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  Round tax at subtotal level (instead of per line item)
                </label>
              </div>
            </div>

            {/* Default Rate + Special Rules */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Default Tax Rate</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Default rate (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.defaultRate}
                        onChange={(e) => update('defaultRate', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Fallback rate when no specific rate matches</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.taxShipping}
                      onChange={(e) => update('taxShipping', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    Apply tax to shipping charges
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.taxDigitalGoods}
                      onChange={(e) => update('taxDigitalGoods', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    Apply tax to digital goods and courses
                  </label>
                  {form.taxDigitalGoods && (
                    <div className="ml-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Digital goods rate (%)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={form.digitalGoodsRate}
                          onChange={(e) => update('digitalGoodsRate', e.target.value)}
                          className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Same as default"
                        />
                        <span className="text-xs text-gray-400">Leave blank to use default rate</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tax ID */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Business Tax Registration</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tax ID label</label>
                    <input
                      type="text"
                      value={form.taxIdLabel}
                      onChange={(e) => update('taxIdLabel', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Tax ID"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">e.g., VAT Number, GST Number, EIN</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Your tax ID</label>
                    <input
                      type="text"
                      value={form.businessTaxId}
                      onChange={(e) => update('businessTaxId', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showTaxId}
                    onChange={(e) => update('showTaxId', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  Display tax ID on invoices and receipts
                </label>
              </div>
            </div>
          </>
        )}

        {/* ── Tax Rates Tab ── */}
        {activeTab === 'rates' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Tax Rates</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {form.calculationMethod === 'stripe'
                    ? 'Stripe Tax handles rate calculation automatically. These manual rates serve as fallbacks if the API is unavailable.'
                    : form.calculationMethod === 'automatic'
                    ? 'Rates are calculated automatically by your provider. These manual rates serve as fallbacks.'
                    : 'Define tax rates for specific regions. The most specific matching rate will be used.'}
                </p>
              </div>
              <button
                onClick={addRate}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Add Rate
              </button>
            </div>

            {form.rates.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-sm text-gray-400">No tax rates configured</p>
                <p className="mt-1 text-xs text-gray-400">
                  {form.calculationMethod === 'manual'
                    ? 'The default rate will be applied to all orders'
                    : 'Your tax provider will calculate rates automatically'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-1">Rate</div>
                  <div className="col-span-2">Country</div>
                  <div className="col-span-2">State</div>
                  <div className="col-span-2">Postal Codes</div>
                  <div className="col-span-1">Options</div>
                  <div className="col-span-1"></div>
                </div>

                {form.rates.map((rate) => (
                  <div key={rate.id} className="grid grid-cols-12 gap-2 items-center rounded-md border border-gray-100 bg-gray-50 p-2">
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={rate.name}
                        onChange={(e) => updateRate(rate.id, { name: e.target.value })}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                        placeholder="Tax name"
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={rate.rate}
                          onChange={(e) => updateRate(rate.id, { rate: e.target.value })}
                          className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none text-right"
                          placeholder="0"
                        />
                        <span className="ml-0.5 text-[10px] text-gray-400">%</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={rate.country}
                        onChange={(e) => updateRate(rate.id, { country: e.target.value })}
                        className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      >
                        <option value="US">US</option>
                        <option value="CA">CA</option>
                        <option value="GB">GB</option>
                        <option value="DE">DE</option>
                        <option value="FR">FR</option>
                        <option value="AU">AU</option>
                        <option value="JP">JP</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      {rate.country === 'US' ? (
                        <select
                          value={rate.state}
                          onChange={(e) => updateRate(rate.id, { state: e.target.value })}
                          className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none"
                        >
                          <option value="">All states</option>
                          {US_STATES.map((s) => (
                            <option key={s.code} value={s.code}>{s.code}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={rate.state}
                          onChange={(e) => updateRate(rate.id, { state: e.target.value })}
                          className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none"
                          placeholder="All"
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={rate.postalCodes}
                        onChange={(e) => updateRate(rate.id, { postalCodes: e.target.value })}
                        className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:border-blue-400 focus:outline-none"
                        placeholder="All"
                      />
                    </div>
                    <div className="col-span-1 flex gap-1.5">
                      <label title="Compound" className="cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rate.compound}
                          onChange={(e) => updateRate(rate.id, { compound: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 h-3 w-3"
                        />
                        <span className="ml-0.5 text-[9px] text-gray-400">C</span>
                      </label>
                      <label title="Tax shipping" className="cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rate.shipping}
                          onChange={(e) => updateRate(rate.id, { shipping: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 h-3 w-3"
                        />
                        <span className="ml-0.5 text-[9px] text-gray-400">S</span>
                      </label>
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => removeRate(rate.id)}
                        className="text-[10px] text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 mt-2">
                  C = Compound (applied on top of other taxes) &middot; S = Apply to shipping
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Nexus Tab ── */}
        {activeTab === 'nexus' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Tax Nexus</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Select the states where you have a tax obligation (physical presence, employees, or economic nexus).
                Tax will only be collected for orders shipped to these states.
              </p>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={selectAllNexus} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={clearAllNexus} className="text-[10px] text-gray-500 hover:text-gray-700 font-medium">
                Clear All
              </button>
              <span className="ml-auto text-xs text-gray-400">
                {form.nexusRegions.length} of {US_STATES.length} states selected
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {US_STATES.map((state) => (
                <button
                  key={state.code}
                  onClick={() => toggleNexusState(state.code)}
                  className={`rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    isNexusState(state.code)
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-semibold">{state.code}</span>
                  <span className="ml-1.5 text-[10px] font-normal opacity-70">{state.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-gray-400">
              Economic nexus thresholds vary by state. Consult a tax professional to determine where you have obligations.
            </p>
          </div>
        )}

        {/* ── Categories Tab ── */}
        {activeTab === 'categories' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Product Tax Categories</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Create categories with custom tax rates for different product types (e.g., clothing, food, digital goods).
                  Assign categories to products in the product editor.
                </p>
              </div>
              <button
                onClick={addCategory}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Add Category
              </button>
            </div>

            {form.categories.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-sm text-gray-400">No tax categories defined</p>
                <p className="mt-1 text-xs text-gray-400">All products will use the default tax rate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {form.categories.map((cat) => (
                  <div key={cat.id} className="rounded-md border border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-3 gap-3 flex-1">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                            className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., Clothing"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={cat.description}
                            onChange={(e) => updateCategory(cat.id, { description: e.target.value })}
                            className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Rate Override (%)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={cat.rate}
                              onChange={(e) => updateCategory(cat.id, { rate: e.target.value })}
                              className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                              placeholder="Default"
                            />
                            <span className="text-[10px] text-gray-400">%</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeCategory(cat.id)}
                        className="ml-3 text-[10px] text-red-500 hover:text-red-700 mt-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
