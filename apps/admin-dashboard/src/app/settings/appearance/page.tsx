'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { GOOGLE_FONTS, buildGoogleFontsUrl } from '@agora-cms/shared';

const FONT_CATEGORIES = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif': 'Sans-Serif',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Handwriting',
  monospace: 'Monospace',
};

/** Searchable font picker component with live preview. */
function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (font: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = GOOGLE_FONTS.filter((f) => {
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (search && !f.family.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Load font for preview when dropdown is open
  const loadFont = useCallback((family: string) => {
    const id = `gf-preview-${family.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsUrl([family]);
    document.head.appendChild(link);
  }, []);

  // Load currently selected font
  useEffect(() => {
    if (value) loadFont(value);
  }, [value, loadFont]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left hover:border-gray-400 focus:border-blue-500 focus:outline-none"
      >
        <span style={{ fontFamily: `'${value}', sans-serif` }}>{value}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100 space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${categoryFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {FONT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${categoryFilter === cat ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No fonts match your search.</p>
            )}
            {filtered.map((f) => {
              loadFont(f.family);
              return (
                <button
                  key={f.family}
                  type="button"
                  onClick={() => { onChange(f.family); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${value === f.family ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  <span style={{ fontFamily: `'${f.family}', ${f.category}` }}>{f.family}</span>
                  <span className="text-[10px] text-gray-400">{f.category}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

interface ThemeSettings {
  colors: ThemeColors;
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number;
    scaleRatio: number;
  };
  layout: {
    maxWidth: string;
    borderRadius: string;
    headerStyle: string;
    footerColumns: number;
  };
  buttons: {
    borderRadius: string;
    uppercase: boolean;
    fontWeight: string;
  };
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-gray-300 p-0"
      />
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700">{label}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

const DEFAULT_THEME: ThemeSettings = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
    scaleRatio: 1.25,
  },
  layout: {
    maxWidth: '1280px',
    borderRadius: '0.5rem',
    headerStyle: 'sticky',
    footerColumns: 4,
  },
  buttons: {
    borderRadius: '0.375rem',
    uppercase: false,
    fontWeight: '600',
  },
};

export default function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'theme'],
    queryFn: () => settingsApi.get('theme'),
  });

  const [form, setForm] = useState<ThemeSettings>(DEFAULT_THEME);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        colors: { ...DEFAULT_THEME.colors, ...settings.colors },
        typography: { ...DEFAULT_THEME.typography, ...settings.typography },
        layout: { ...DEFAULT_THEME.layout, ...settings.layout },
        buttons: { ...DEFAULT_THEME.buttons, ...settings.buttons },
      });
      setDirty(false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: ThemeSettings) => settingsApi.update('theme', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Appearance settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setForm((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
    setDirty(true);
  };

  const updateTypography = (key: string, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
    setDirty(true);
  };

  const updateLayout = (key: string, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      layout: { ...prev.layout, [key]: value },
    }));
    setDirty(true);
  };

  const updateButtons = (key: string, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      buttons: { ...prev.buttons, [key]: value },
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
          <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Brand colors, typography, and layout defaults for your storefront
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Colors + Typography + Layout + Buttons */}
        <div className="xl:col-span-2 space-y-6">
          {/* Brand Colors */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Brand Colors</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ColorInput label="Primary" value={form.colors.primary} onChange={(v) => updateColor('primary', v)} />
              <ColorInput label="Secondary" value={form.colors.secondary} onChange={(v) => updateColor('secondary', v)} />
              <ColorInput label="Accent" value={form.colors.accent} onChange={(v) => updateColor('accent', v)} />
              <ColorInput label="Background" value={form.colors.background} onChange={(v) => updateColor('background', v)} />
              <ColorInput label="Surface" value={form.colors.surface} onChange={(v) => updateColor('surface', v)} />
              <ColorInput label="Text" value={form.colors.text} onChange={(v) => updateColor('text', v)} />
              <ColorInput label="Text Muted" value={form.colors.textMuted} onChange={(v) => updateColor('textMuted', v)} />
              <ColorInput label="Border" value={form.colors.border} onChange={(v) => updateColor('border', v)} />
              <ColorInput label="Error" value={form.colors.error} onChange={(v) => updateColor('error', v)} />
              <ColorInput label="Success" value={form.colors.success} onChange={(v) => updateColor('success', v)} />
              <ColorInput label="Warning" value={form.colors.warning} onChange={(v) => updateColor('warning', v)} />
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Typography</h2>
            <div className="grid grid-cols-2 gap-4">
              <FontPicker
                label="Heading Font"
                value={form.typography.headingFont}
                onChange={(f) => updateTypography('headingFont', f)}
              />
              <FontPicker
                label="Body Font"
                value={form.typography.bodyFont}
                onChange={(f) => updateTypography('bodyFont', f)}
              />
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Base Font Size: {form.typography.baseSize}px
                </label>
                <input
                  type="range"
                  min={12}
                  max={24}
                  step={1}
                  value={form.typography.baseSize}
                  onChange={(e) => updateTypography('baseSize', Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>12px</span>
                  <span>24px</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Scale Ratio: {form.typography.scaleRatio}
                </label>
                <input
                  type="range"
                  min={1.1}
                  max={1.5}
                  step={0.05}
                  value={form.typography.scaleRatio}
                  onChange={(e) => updateTypography('scaleRatio', Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>1.1 (tight)</span>
                  <span>1.5 (spacious)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Layout */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Layout</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Width</label>
                <select
                  value={form.layout.maxWidth}
                  onChange={(e) => updateLayout('maxWidth', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="1024px">1024px (Narrow)</option>
                  <option value="1152px">1152px</option>
                  <option value="1280px">1280px (Default)</option>
                  <option value="1440px">1440px (Wide)</option>
                  <option value="1536px">1536px (Extra Wide)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius</label>
                <select
                  value={form.layout.borderRadius}
                  onChange={(e) => updateLayout('borderRadius', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="0">None (Sharp)</option>
                  <option value="0.25rem">Small</option>
                  <option value="0.375rem">Medium</option>
                  <option value="0.5rem">Default</option>
                  <option value="0.75rem">Large</option>
                  <option value="1rem">Extra Large</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Header Style</label>
                <select
                  value={form.layout.headerStyle}
                  onChange={(e) => updateLayout('headerStyle', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="sticky">Sticky</option>
                  <option value="fixed">Fixed</option>
                  <option value="static">Static</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Footer Columns</label>
                <select
                  value={form.layout.footerColumns}
                  onChange={(e) => updateLayout('footerColumns', Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} columns</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Buttons</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius</label>
                <select
                  value={form.buttons.borderRadius}
                  onChange={(e) => updateButtons('borderRadius', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="0">Square</option>
                  <option value="0.25rem">Slight</option>
                  <option value="0.375rem">Default</option>
                  <option value="0.5rem">Rounded</option>
                  <option value="9999px">Pill</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Font Weight</label>
                <select
                  value={form.buttons.fontWeight}
                  onChange={(e) => updateButtons('fontWeight', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="400">Normal (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semibold (600)</option>
                  <option value="700">Bold (700)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.buttons.uppercase}
                    onChange={(e) => updateButtons('uppercase', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Uppercase Text
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow sticky top-8">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Preview</h2>

            {/* Color Swatches */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Color Palette</p>
              <div className="grid grid-cols-6 gap-1">
                {Object.entries(form.colors).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div
                      className="h-8 w-full rounded border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                    <p className="mt-0.5 text-[8px] text-gray-400 truncate">{name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Preview */}
            <div className="mb-4 rounded border border-gray-200 p-4" style={{ backgroundColor: form.colors.background }}>
              <h3
                style={{
                  fontFamily: `'${form.typography.headingFont}', sans-serif`,
                  color: form.colors.text,
                  fontSize: `${form.typography.baseSize * form.typography.scaleRatio * form.typography.scaleRatio}px`,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                Heading Preview
              </h3>
              <p
                style={{
                  fontFamily: `'${form.typography.bodyFont}', sans-serif`,
                  color: form.colors.textMuted,
                  fontSize: `${form.typography.baseSize}px`,
                  lineHeight: 1.5,
                }}
              >
                This is body text in {form.typography.bodyFont} at {form.typography.baseSize}px.
              </p>
            </div>

            {/* Button Preview */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Buttons</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  style={{
                    backgroundColor: form.colors.primary,
                    color: '#fff',
                    borderRadius: form.buttons.borderRadius,
                    fontWeight: Number(form.buttons.fontWeight),
                    textTransform: form.buttons.uppercase ? 'uppercase' : 'none',
                    padding: '8px 16px',
                    fontSize: '13px',
                    border: 'none',
                    letterSpacing: form.buttons.uppercase ? '0.05em' : 'normal',
                  }}
                >
                  Primary
                </button>
                <button
                  style={{
                    backgroundColor: form.colors.secondary,
                    color: '#fff',
                    borderRadius: form.buttons.borderRadius,
                    fontWeight: Number(form.buttons.fontWeight),
                    textTransform: form.buttons.uppercase ? 'uppercase' : 'none',
                    padding: '8px 16px',
                    fontSize: '13px',
                    border: 'none',
                    letterSpacing: form.buttons.uppercase ? '0.05em' : 'normal',
                  }}
                >
                  Secondary
                </button>
                <button
                  style={{
                    backgroundColor: 'transparent',
                    color: form.colors.primary,
                    borderRadius: form.buttons.borderRadius,
                    fontWeight: Number(form.buttons.fontWeight),
                    textTransform: form.buttons.uppercase ? 'uppercase' : 'none',
                    padding: '8px 16px',
                    fontSize: '13px',
                    border: `1px solid ${form.colors.border}`,
                    letterSpacing: form.buttons.uppercase ? '0.05em' : 'normal',
                  }}
                >
                  Outline
                </button>
              </div>
            </div>

            {/* Card Preview */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Card Preview</p>
              <div
                className="p-4 border"
                style={{
                  backgroundColor: form.colors.surface,
                  borderColor: form.colors.border,
                  borderRadius: form.layout.borderRadius,
                }}
              >
                <h4
                  style={{
                    fontFamily: `'${form.typography.headingFont}', sans-serif`,
                    color: form.colors.text,
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Sample Card
                </h4>
                <p
                  style={{
                    fontFamily: `'${form.typography.bodyFont}', sans-serif`,
                    color: form.colors.textMuted,
                    fontSize: '12px',
                  }}
                >
                  A preview of how cards will look with your theme settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
