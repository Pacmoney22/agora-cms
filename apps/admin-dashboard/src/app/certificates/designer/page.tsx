'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CertificateTemplate, DEFAULT_CERTIFICATE_TEMPLATE } from '../types';

function generateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export default function CertificateDesignerPage() {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [template, setTemplate] = useState<CertificateTemplate>({
    ...DEFAULT_CERTIFICATE_TEMPLATE,
    id: generateId(),
  });

  // Load templates from settings
  const { data: savedData, isLoading } = useQuery({
    queryKey: ['settings', 'certificate_templates'],
    queryFn: () => settingsApi.get('certificate_templates'),
  });

  useEffect(() => {
    if (savedData?.value?.templates && Array.isArray(savedData.value.templates)) {
      const loaded = savedData.value.templates as CertificateTemplate[];
      setTemplates(loaded);
      const first = loaded[0];
      if (first && !selectedId) {
        setSelectedId(first.id);
        setTemplate(first);
      }
    }
  }, [savedData, selectedId]);

  // Save templates mutation
  const saveMutation = useMutation({
    mutationFn: (tpls: CertificateTemplate[]) =>
      settingsApi.update('certificate_templates', { templates: tpls }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'certificate_templates'] });
      toast.success('Templates saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const set = (updates: Partial<CertificateTemplate>) =>
    setTemplate((t) => ({ ...t, ...updates, updatedAt: new Date().toISOString() }));

  const saveCurrentTemplate = () => {
    const now = new Date().toISOString();
    const updated = { ...template, updatedAt: now };
    const idx = templates.findIndex((t) => t.id === updated.id);
    let newList: CertificateTemplate[];
    if (idx >= 0) {
      newList = [...templates];
      newList[idx] = updated;
    } else {
      newList = [...templates, { ...updated, createdAt: now }];
    }

    // If this template is marked as default, unmark others
    if (updated.isDefault) {
      newList = newList.map((t) => (t.id === updated.id ? t : { ...t, isDefault: false }));
    }

    setTemplates(newList);
    setTemplate(updated);
    saveMutation.mutate(newList);
  };

  const createNewTemplate = () => {
    const id = generateId();
    const newTpl: CertificateTemplate = {
      ...DEFAULT_CERTIFICATE_TEMPLATE,
      id,
      name: `New Template ${templates.length + 1}`,
      isDefault: templates.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplate(newTpl);
    setSelectedId(id);
  };

  const selectTemplate = (id: string) => {
    const found = templates.find((t) => t.id === id);
    if (found) {
      setSelectedId(id);
      setTemplate(found);
    }
  };

  const deleteTemplate = (id: string) => {
    const newList = templates.filter((t) => t.id !== id);
    setTemplates(newList);
    saveMutation.mutate(newList);
    if (selectedId === id) {
      const first = newList[0];
      if (first) {
        setSelectedId(first.id);
        setTemplate(first);
      } else {
        const id2 = generateId();
        setSelectedId(id2);
        setTemplate({ ...DEFAULT_CERTIFICATE_TEMPLATE, id: id2 });
      }
    }
  };

  const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  // Preview dimensions
  const isBadge = template.type === 'badge';
  const previewBaseW = isBadge ? (template.width || 4) * 72 : template.orientation === 'landscape' ? 842 : 595;
  const previewBaseH = isBadge ? (template.height || 3) * 72 : template.orientation === 'landscape' ? 595 : 842;
  const maxPreviewW = 520;
  const scaleFactor = previewBaseW > maxPreviewW ? maxPreviewW / previewBaseW : 1;
  const previewW = previewBaseW * scaleFactor;
  const previewH = previewBaseH * scaleFactor;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/certificates"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          &larr; Back to Certificates
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Certificate Designer
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage certificate and badge templates
            </p>
          </div>
          <button
            onClick={saveCurrentTemplate}
            disabled={saveMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Template List */}
        <div className="col-span-3 space-y-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Templates</h2>
              <button
                onClick={createNewTemplate}
                className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                + New
              </button>
            </div>
            {templates.length === 0 && !selectedId ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No templates yet. Click + New to create one.
              </p>
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`group flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors ${
                      selectedId === t.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                    }`}
                    onClick={() => selectTemplate(t.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {t.type === 'badge' ? 'Badge' : 'Certificate'}
                        {t.isDefault ? ' \u2022 Default' : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete template "${t.name}"?`)) {
                          deleteTemplate(t.id);
                        }
                      }}
                      className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete template"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* Show current unsaved template in list if not already in templates */}
                {template.id && !templates.find((t) => t.id === template.id) && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {template.name}
                    </p>
                    <p className="text-[10px] text-amber-600">Unsaved</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center + Right: Design Controls + Preview */}
        <div className="col-span-9 space-y-4">
          {/* Basic Settings */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Template Settings
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className={labelCls}>Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => set({ name: e.target.value })}
                  className={inputCls}
                  placeholder="My Certificate"
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select
                  value={template.type}
                  onChange={(e) =>
                    set({ type: e.target.value as 'certificate' | 'badge' })
                  }
                  className={inputCls}
                >
                  <option value="certificate">Certificate</option>
                  <option value="badge">Badge</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Orientation</label>
                <select
                  value={template.orientation}
                  onChange={(e) =>
                    set({
                      orientation: e.target.value as 'landscape' | 'portrait',
                    })
                  }
                  className={inputCls}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    checked={template.isDefault}
                    onChange={(e) => set({ isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-700">Default template</span>
                </label>
              </div>
            </div>

            {/* Badge-specific dimensions */}
            {isBadge && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div>
                  <label className={labelCls}>Width (inches)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={template.width || 4}
                    onChange={(e) => set({ width: +e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Height (inches)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={template.height || 3}
                    onChange={(e) => set({ height: +e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Colors</h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                { key: 'backgroundColor' as const, label: 'Background' },
                { key: 'primaryColor' as const, label: 'Primary' },
                { key: 'textColor' as const, label: 'Text' },
                { key: 'borderColor' as const, label: 'Border' },
                { key: 'accentColor' as const, label: 'Accent' },
              ].map((c) => (
                <div key={c.key}>
                  <label className={labelCls}>{c.label}</label>
                  <input
                    type="color"
                    value={template[c.key]}
                    onChange={(e) => set({ [c.key]: e.target.value })}
                    className="h-9 w-full rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={template[c.key]}
                    onChange={(e) => set({ [c.key]: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-[10px] font-mono text-gray-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Typography & Text
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className={labelCls}>Title Text</label>
                <input
                  type="text"
                  value={template.titleText}
                  onChange={(e) => set({ titleText: e.target.value })}
                  className={inputCls}
                  placeholder="Certificate of Completion"
                />
              </div>
              <div>
                <label className={labelCls}>Subtitle Text</label>
                <input
                  type="text"
                  value={template.subtitleText}
                  onChange={(e) => set({ subtitleText: e.target.value })}
                  className={inputCls}
                  placeholder="This is to certify that"
                />
              </div>
              <div>
                <label className={labelCls}>Completion Text</label>
                <input
                  type="text"
                  value={template.completionText}
                  onChange={(e) => set({ completionText: e.target.value })}
                  className={inputCls}
                  placeholder="has successfully completed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelCls}>
                  Student Name Font Size: {template.nameFontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="60"
                  value={template.nameFontSize}
                  onChange={(e) => set({ nameFontSize: +e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Course Title Font Size: {template.courseTitleFontSize}px
                </label>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={template.courseTitleFontSize}
                  onChange={(e) =>
                    set({ courseTitleFontSize: +e.target.value })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Organization Name</label>
                <input
                  type="text"
                  value={template.organizationName}
                  onChange={(e) => set({ organizationName: e.target.value })}
                  className={inputCls}
                  placeholder="Acme Academy"
                />
              </div>
              <div>
                <label className={labelCls}>Custom Footer Text</label>
                <input
                  type="text"
                  value={template.customFooterText}
                  onChange={(e) => set({ customFooterText: e.target.value })}
                  className={inputCls}
                  placeholder="Powered by Agora CMS"
                />
              </div>
            </div>
          </div>

          {/* Border & Toggles */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Border & Display Options
            </h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className={labelCls}>Border Style</label>
                <select
                  value={template.borderStyle}
                  onChange={(e) =>
                    set({
                      borderStyle: e.target.value as
                        | 'single'
                        | 'double'
                        | 'none',
                    })
                  }
                  className={inputCls}
                >
                  <option value="double">Double</option>
                  <option value="single">Single</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Border Width</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={template.borderWidth}
                  onChange={(e) => set({ borderWidth: +e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'showLogo' as const, label: 'Show Logo' },
                { key: 'showBorder' as const, label: 'Show Border' },
                { key: 'showInstructor' as const, label: 'Show Instructor' },
                { key: 'showDate' as const, label: 'Show Completion Date' },
                {
                  key: 'showVerificationCode' as const,
                  label: 'Show Verification Code',
                },
                {
                  key: 'showSignatureImage' as const,
                  label: 'Show Signature Image',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={template[opt.key]}
                    onChange={(e) =>
                      set({ [opt.key]: e.target.checked } as any)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Images</h2>
            <div className="space-y-4">
              {template.showLogo && (
                <MediaPicker
                  label="Logo Image"
                  value={template.logoImage}
                  onChange={(v) => set({ logoImage: v })}
                  accept="image/*"
                  helpText="Organization or course logo displayed at the top"
                />
              )}
              <MediaPicker
                label="Background Image"
                value={template.backgroundImage}
                onChange={(v) => set({ backgroundImage: v })}
                accept="image/*"
                helpText="Optional background watermark or pattern"
              />
              {template.showSignatureImage && (
                <MediaPicker
                  label="Signature Image"
                  value={template.signatureImage}
                  onChange={(v) => set({ signatureImage: v })}
                  accept="image/*"
                  helpText="Digital signature image for the instructor line"
                />
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Live Preview
            </h2>
            <div className="flex justify-center">
              <div
                style={{
                  width: previewW,
                  height: previewH,
                  backgroundColor: template.backgroundColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                className="rounded-lg shadow-lg"
              >
                {/* Background image */}
                {template.backgroundImage && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${template.backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.15,
                    }}
                  />
                )}

                {/* Border */}
                {template.showBorder && template.borderStyle !== 'none' && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        inset: Math.round(8 * scaleFactor),
                        border: `${Math.max(1, Math.round(template.borderWidth * scaleFactor))}px solid ${template.primaryColor}`,
                        borderRadius: 4,
                        pointerEvents: 'none',
                      }}
                    />
                    {template.borderStyle === 'double' && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: Math.round(16 * scaleFactor),
                          border: `${Math.max(1, Math.round((template.borderWidth * 0.4) * scaleFactor))}px solid ${template.borderColor}`,
                          borderRadius: 2,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </>
                )}

                {/* Content */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: `${Math.round(30 * scaleFactor)}px ${Math.round(40 * scaleFactor)}px`,
                  }}
                >
                  {/* Logo */}
                  {template.showLogo && template.logoImage && (
                    <div
                      style={{
                        height: Math.round(40 * scaleFactor),
                        marginBottom: Math.round(8 * scaleFactor),
                      }}
                    >
                      <div
                        style={{
                          width: Math.round(80 * scaleFactor),
                          height: Math.round(40 * scaleFactor),
                          backgroundColor: '#e5e7eb',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: Math.round(9 * scaleFactor),
                          color: '#9ca3af',
                        }}
                      >
                        Logo
                      </div>
                    </div>
                  )}

                  {/* Organization Name */}
                  {template.organizationName && (
                    <p
                      style={{
                        fontSize: Math.round(10 * scaleFactor),
                        color: template.accentColor,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: Math.round(8 * scaleFactor),
                      }}
                    >
                      {template.organizationName}
                    </p>
                  )}

                  {/* Title */}
                  <p
                    style={{
                      fontSize: Math.round(
                        (isBadge ? 20 : 36) * scaleFactor,
                      ),
                      fontWeight: 'bold',
                      color: template.primaryColor,
                      textAlign: 'center',
                      marginBottom: Math.round(6 * scaleFactor),
                    }}
                  >
                    {template.titleText}
                  </p>

                  {/* Subtitle */}
                  <p
                    style={{
                      fontSize: Math.round(10 * scaleFactor),
                      color: template.accentColor,
                      marginBottom: Math.round(4 * scaleFactor),
                    }}
                  >
                    {template.subtitleText}
                  </p>

                  {/* Student Name */}
                  <p
                    style={{
                      fontSize: Math.round(
                        template.nameFontSize * scaleFactor * (isBadge ? 0.5 : 0.7),
                      ),
                      fontWeight: 'bold',
                      color: template.textColor,
                      marginBottom: Math.round(4 * scaleFactor),
                    }}
                  >
                    Jane Smith
                  </p>

                  {/* Completion text */}
                  <p
                    style={{
                      fontSize: Math.round(10 * scaleFactor),
                      color: template.accentColor,
                      marginBottom: Math.round(4 * scaleFactor),
                    }}
                  >
                    {template.completionText}
                  </p>

                  {/* Course title */}
                  <p
                    style={{
                      fontSize: Math.round(
                        template.courseTitleFontSize *
                          scaleFactor *
                          (isBadge ? 0.5 : 0.7),
                      ),
                      fontWeight: 'bold',
                      color: template.primaryColor,
                      textAlign: 'center',
                      marginBottom: Math.round(10 * scaleFactor),
                    }}
                  >
                    Introduction to Web Development
                  </p>

                  {/* Date */}
                  {template.showDate && (
                    <p
                      style={{
                        fontSize: Math.round(8 * scaleFactor),
                        color: template.accentColor,
                        marginBottom: Math.round(8 * scaleFactor),
                      }}
                    >
                      Completed on February 18, 2026
                    </p>
                  )}

                  {/* Instructor */}
                  {template.showInstructor && (
                    <div
                      style={{
                        marginTop: Math.round(6 * scaleFactor),
                        textAlign: 'center',
                      }}
                    >
                      {template.showSignatureImage && template.signatureImage && (
                        <div
                          style={{
                            width: Math.round(60 * scaleFactor),
                            height: Math.round(20 * scaleFactor),
                            backgroundColor: '#f3f4f6',
                            borderRadius: 2,
                            margin: '0 auto',
                            marginBottom: Math.round(2 * scaleFactor),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: Math.round(6 * scaleFactor),
                            color: '#9ca3af',
                          }}
                        >
                          Signature
                        </div>
                      )}
                      <div
                        style={{
                          width: Math.round(100 * scaleFactor),
                          height: 1,
                          backgroundColor: '#d1d5db',
                          margin: '0 auto',
                          marginBottom: Math.round(2 * scaleFactor),
                        }}
                      />
                      <p
                        style={{
                          fontSize: Math.round(9 * scaleFactor),
                          fontWeight: 'bold',
                          color: template.textColor,
                        }}
                      >
                        Dr. John Doe
                      </p>
                      <p
                        style={{
                          fontSize: Math.round(7 * scaleFactor),
                          color: template.accentColor,
                        }}
                      >
                        Instructor
                      </p>
                    </div>
                  )}

                  {/* Verification code */}
                  {template.showVerificationCode && (
                    <p
                      style={{
                        position: 'absolute',
                        bottom: Math.round(12 * scaleFactor),
                        fontSize: Math.round(6 * scaleFactor),
                        color: '#9ca3af',
                      }}
                    >
                      Verification Code: CERT-ABC12345-XYZ
                    </p>
                  )}

                  {/* Custom footer */}
                  {template.customFooterText && (
                    <p
                      style={{
                        position: 'absolute',
                        bottom: Math.round(4 * scaleFactor),
                        fontSize: Math.round(5 * scaleFactor),
                        color: '#d1d5db',
                      }}
                    >
                      {template.customFooterText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
