'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'America/Bogota',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'UTC',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'sv', label: 'Swedish' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '02/12/2026' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '12/02/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-02-12' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '12.02.2026' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '12-02-2026' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Feb 12, 2026' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '12 Feb 2026' },
  { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY', example: 'February 12, 2026' },
];

const TIME_FORMATS = [
  { value: '12h', label: '12-hour', example: '2:30 PM' },
  { value: '24h', label: '24-hour', example: '14:30' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)', decimals: 2 },
  { code: 'EUR', symbol: '\u20AC', label: 'Euro (EUR)', decimals: 2 },
  { code: 'GBP', symbol: '\u00A3', label: 'British Pound (GBP)', decimals: 2 },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar (CAD)', decimals: 2 },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD)', decimals: 2 },
  { code: 'JPY', symbol: '\u00A5', label: 'Japanese Yen (JPY)', decimals: 0 },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)', decimals: 2 },
  { code: 'CNY', symbol: '\u00A5', label: 'Chinese Yuan (CNY)', decimals: 2 },
  { code: 'INR', symbol: '\u20B9', label: 'Indian Rupee (INR)', decimals: 2 },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real (BRL)', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso (MXN)', decimals: 2 },
  { code: 'KRW', symbol: '\u20A9', label: 'South Korean Won (KRW)', decimals: 0 },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona (SEK)', decimals: 2 },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian Krone (NOK)', decimals: 2 },
  { code: 'DKK', symbol: 'kr', label: 'Danish Krone (DKK)', decimals: 2 },
  { code: 'PLN', symbol: 'z\u0142', label: 'Polish Zloty (PLN)', decimals: 2 },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand (ZAR)', decimals: 2 },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (SGD)', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar (HKD)', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZD)', decimals: 2 },
  { code: 'TRY', symbol: '\u20BA', label: 'Turkish Lira (TRY)', decimals: 2 },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)', decimals: 2 },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)', decimals: 2 },
];

const THOUSANDS_SEPARATORS = [
  { value: ',', label: 'Comma (1,000,000)' },
  { value: '.', label: 'Period (1.000.000)' },
  { value: ' ', label: 'Space (1 000 000)' },
  { value: "'", label: "Apostrophe (1'000'000)" },
  { value: '', label: 'None (1000000)' },
];

const DECIMAL_SEPARATORS = [
  { value: '.', label: 'Period (99.99)' },
  { value: ',', label: 'Comma (99,99)' },
];

const WEEK_STARTS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'saturday', label: 'Saturday' },
];

const MEASUREMENT_UNITS = [
  { value: 'metric', label: 'Metric (kg, cm, km)' },
  { value: 'imperial', label: 'Imperial (lb, in, mi)' },
];

interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  siteTagline: string;
  adminEmail: string;
  siteLogo: string;
  favicon: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  currencyPosition: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
  weekStartsOn: string;
  measurementUnit: string;
}

const DEFAULTS: GeneralSettings = {
  siteName: '',
  siteUrl: '',
  siteTagline: '',
  adminEmail: '',
  siteLogo: '',
  favicon: '',
  language: 'en',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  currencyPosition: 'before',
  thousandsSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
  weekStartsOn: 'sunday',
  measurementUnit: 'imperial',
};

function formatCurrencyPreview(
  amount: number,
  currency: string,
  position: string,
  thousandsSep: string,
  decimalSep: string,
  decimalPlaces: number,
): string {
  const curr = CURRENCIES.find((c) => c.code === currency);
  const symbol = curr?.symbol || currency;

  const fixed = amount.toFixed(decimalPlaces);
  const [intPart = '0', decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep || '');
  const formatted = decimalPlaces > 0 ? `${withThousands}${decimalSep}${decPart}` : withThousands;

  if (position === 'before') return `${symbol}${formatted}`;
  if (position === 'before_space') return `${symbol} ${formatted}`;
  if (position === 'after_space') return `${formatted} ${symbol}`;
  return `${formatted}${symbol}`;
}

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: () => settingsApi.get('general'),
  });

  const [form, setForm] = useState<GeneralSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULTS, ...settings });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: GeneralSettings) => settingsApi.update('general', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('General settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Auto-adjust decimal places when currency changes
  const handleCurrencyChange = (code: string) => {
    const curr = CURRENCIES.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      currency: code,
      decimalPlaces: curr?.decimals ?? 2,
    }));
    setDirty(true);
  };

  // Prevent matching thousands & decimal separators
  const handleThousandsChange = (value: string) => {
    if (value === form.decimalSeparator && value !== '') {
      // Swap them
      setForm((prev) => ({
        ...prev,
        thousandsSeparator: value,
        decimalSeparator: prev.thousandsSeparator || '.',
      }));
    } else {
      setForm((prev) => ({ ...prev, thousandsSeparator: value }));
    }
    setDirty(true);
  };

  const handleDecimalChange = (value: string) => {
    if (value === form.thousandsSeparator) {
      setForm((prev) => ({
        ...prev,
        decimalSeparator: value,
        thousandsSeparator: prev.decimalSeparator || ',',
      }));
    } else {
      setForm((prev) => ({ ...prev, decimalSeparator: value }));
    }
    setDirty(true);
  };

  const currencyPreview = useMemo(
    () =>
      formatCurrencyPreview(
        1234567.89,
        form.currency,
        form.currencyPosition,
        form.thousandsSeparator,
        form.decimalSeparator,
        form.decimalPlaces,
      ),
    [form.currency, form.currencyPosition, form.thousandsSeparator, form.decimalSeparator, form.decimalPlaces],
  );

  const datePreview = useMemo(() => {
    const df = DATE_FORMATS.find((d) => d.value === form.dateFormat);
    const tf = TIME_FORMATS.find((t) => t.value === form.timeFormat);
    return `${df?.example || form.dateFormat} ${tf?.example || ''}`.trim();
  }, [form.dateFormat, form.timeFormat]);

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
          <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Site identity, localization, and formatting preferences
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
        {/* Site Identity */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Site Identity</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Site Name
              </label>
              <input
                type="text"
                value={form.siteName}
                onChange={(e) => update('siteName', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="My Awesome Site"
              />
              <p className="mt-1 text-xs text-gray-400">
                Displayed in the browser tab and used as a default in SEO titles
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={form.siteTagline}
                onChange={(e) => update('siteTagline', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your site's slogan or short description"
              />
              <p className="mt-1 text-xs text-gray-400">
                A brief description shown in search results and the site footer
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Site URL
              </label>
              <input
                type="url"
                value={form.siteUrl}
                onChange={(e) => update('siteUrl', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://example.com"
              />
              <p className="mt-1 text-xs text-gray-400">
                The public-facing URL of your storefront
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => update('adminEmail', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-xs text-gray-400">
                System notifications and contact form submissions are sent to this address
              </p>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Branding</h2>
          <div className="space-y-5">
            <MediaPicker
              label="Site Logo"
              value={form.siteLogo}
              onChange={(v) => update('siteLogo', v)}
              accept="image/*,.svg"
              helpText="Recommended: SVG or PNG with transparent background. Displayed in the storefront header."
            />
            <MediaPicker
              label="Favicon"
              value={form.favicon}
              onChange={(v) => update('favicon', v)}
              accept="image/*,.ico"
              helpText="Recommended: 32x32 or 16x16 .ico or .png. Shows in browser tabs."
            />
          </div>
        </div>

        {/* Localization */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Localization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Default Language
              </label>
              <select
                value={form.language}
                onChange={(e) => update('language', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={form.timezone}
                onChange={(e) => update('timezone', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Week Starts On
              </label>
              <select
                value={form.weekStartsOn}
                onChange={(e) => update('weekStartsOn', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {WEEK_STARTS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Measurement Units
              </label>
              <select
                value={form.measurementUnit}
                onChange={(e) => update('measurementUnit', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Used for product weights, dimensions, and shipping calculations
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time Formatting */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Date & Time Format</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 font-mono">
              {datePreview}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={form.dateFormat}
                onChange={(e) => update('dateFormat', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DATE_FORMATS.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label} ({df.example})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                value={form.timeFormat}
                onChange={(e) => update('timeFormat', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TIME_FORMATS.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label} ({tf.example})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Currency & Number Formatting */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Currency & Number Format</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 font-mono">
              {currencyPreview}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} - {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Currency Symbol Position
              </label>
              <select
                value={form.currencyPosition}
                onChange={(e) => update('currencyPosition', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="before">Before ($100)</option>
                <option value="before_space">Before with space ($ 100)</option>
                <option value="after">After (100$)</option>
                <option value="after_space">After with space (100 $)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Thousands Separator
              </label>
              <select
                value={form.thousandsSeparator}
                onChange={(e) => handleThousandsChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {THOUSANDS_SEPARATORS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Decimal Separator
              </label>
              <select
                value={form.decimalSeparator}
                onChange={(e) => handleDecimalChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DECIMAL_SEPARATORS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Decimal Places
              </label>
              <select
                value={form.decimalPlaces}
                onChange={(e) => update('decimalPlaces', parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>0 (1,234)</option>
                <option value={2}>2 (1,234.56)</option>
                <option value={3}>3 (1,234.567)</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Number of digits after the decimal for prices and amounts
              </p>
            </div>
          </div>

          {/* Separator conflict warning */}
          {form.thousandsSeparator === form.decimalSeparator && form.thousandsSeparator !== '' && (
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                Thousands and decimal separators cannot be the same character. The system will auto-swap them if needed.
              </p>
            </div>
          )}
        </div>

        {/* Formatting Preview */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Formatting Preview</h2>
          <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-gray-500">Date:</div>
              <div className="font-mono text-gray-900">
                {DATE_FORMATS.find((d) => d.value === form.dateFormat)?.example}
              </div>
              <div className="text-gray-500">Time:</div>
              <div className="font-mono text-gray-900">
                {TIME_FORMATS.find((t) => t.value === form.timeFormat)?.example}
              </div>
              <div className="text-gray-500">Price:</div>
              <div className="font-mono text-gray-900">{currencyPreview}</div>
              <div className="text-gray-500">Small amount:</div>
              <div className="font-mono text-gray-900">
                {formatCurrencyPreview(
                  9.99,
                  form.currency,
                  form.currencyPosition,
                  form.thousandsSeparator,
                  form.decimalSeparator,
                  form.decimalPlaces,
                )}
              </div>
              <div className="text-gray-500">Zero-decimal:</div>
              <div className="font-mono text-gray-900">
                {formatCurrencyPreview(
                  50,
                  form.currency,
                  form.currencyPosition,
                  form.thousandsSeparator,
                  form.decimalSeparator,
                  form.decimalPlaces,
                )}
              </div>
              <div className="text-gray-500">Weight:</div>
              <div className="font-mono text-gray-900">
                {form.measurementUnit === 'metric' ? '2.5 kg' : '5.51 lb'}
              </div>
              <div className="text-gray-500">Dimensions:</div>
              <div className="font-mono text-gray-900">
                {form.measurementUnit === 'metric'
                  ? '30 x 20 x 15 cm'
                  : '12 x 8 x 6 in'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
