'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface BadgeTemplate {
  width: number;
  height: number;
  unit: 'in' | 'mm';
  orientation: 'portrait' | 'landscape';
  backgroundColor: string;
  backgroundImage: string;
  showLogo: boolean;
  logoPosition: 'top' | 'bottom';
  logoImage: string;
  showName: boolean;
  nameSize: number;
  nameColor: string;
  showEmail: boolean;
  showCompany: boolean;
  showTicketType: boolean;
  showQrCode: boolean;
  showPhoto: boolean;
  customText: string;
  customTextPosition: 'top' | 'bottom';
  borderColor: string;
  borderWidth: number;
}

const DEFAULT_TEMPLATE: BadgeTemplate = {
  width: 4, height: 3, unit: 'in', orientation: 'landscape',
  backgroundColor: '#ffffff', backgroundImage: '',
  showLogo: true, logoPosition: 'top', logoImage: '',
  showName: true, nameSize: 24, nameColor: '#111827',
  showEmail: true, showCompany: true, showTicketType: true,
  showQrCode: true, showPhoto: false,
  customText: '', customTextPosition: 'bottom',
  borderColor: '#3b82f6', borderWidth: 2,
};

const BADGE_SIZES = [
  // Standard badge sizes
  { label: '4" × 3" (Standard)', width: 4, height: 3, group: 'Standard' },
  { label: '3.5" × 2" (Small)', width: 3.5, height: 2, group: 'Standard' },
  { label: '4" × 6" (Large)', width: 4, height: 6, group: 'Standard' },
  { label: 'A6 (105mm × 148mm)', width: 105, height: 148, group: 'Standard' },
  // Avery peel-and-stick nametags
  { label: 'Avery 5395 (2⅓" × 3⅜")', width: 2.333, height: 3.375, group: 'Avery Nametags' },
  { label: 'Avery 8395 (2⅓" × 3⅜")', width: 2.333, height: 3.375, group: 'Avery Nametags' },
  { label: 'Avery 5390 (2¼" × 3½")', width: 2.25, height: 3.5, group: 'Avery Nametags' },
  { label: 'Avery 5392 (3" × 4")', width: 3, height: 4, group: 'Avery Nametags' },
  { label: 'Avery 5163 (2" × 4")', width: 2, height: 4, group: 'Avery Nametags' },
];

export default function BadgesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<BadgeTemplate>(DEFAULT_TEMPLATE);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [printAll, setPrintAll] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('registered');
  const [showPreview, setShowPreview] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const { data: badgeTemplate } = useQuery({
    queryKey: ['events', eventId, 'badge-template'],
    queryFn: () => eventsApi.getBadgeTemplate(eventId),
    enabled: !!eventId,
    // Use fetched template if exists
  });

  const { data: attendeesData } = useQuery({
    queryKey: ['events', eventId, 'attendees', { status: statusFilter || undefined, limit: 200 }],
    queryFn: () => eventsApi.listAttendees(eventId, { limit: 200, status: statusFilter || undefined }),
    enabled: !!eventId,
  });

  const attendees = attendeesData?.data || [];

  // Set template from server once loaded
  useState(() => {
    if (badgeTemplate) setTemplate({ ...DEFAULT_TEMPLATE, ...badgeTemplate });
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data: BadgeTemplate) => eventsApi.updateBadgeTemplate(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'badge-template'] });
      toast.success('Badge template saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const printMutation = useMutation({
    mutationFn: (attendeeIds: string[]) => eventsApi.printBadges(eventId, attendeeIds),
    onSuccess: (result: any) => {
      toast.success(`${result?.count || 'Badges'} generated for printing`);
      if (result?.url) window.open(result.url, '_blank');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePrint = () => {
    const ids = printAll ? attendees.map((a: any) => a.id) : [...selectedAttendees];
    if (ids.length === 0) {
      toast.error('No attendees selected');
      return;
    }
    printMutation.mutate(ids);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const set = (updates: Partial<BadgeTemplate>) => setTemplate((t) => ({ ...t, ...updates }));
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
  const smallLabelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  // Preview dimensions (scaled to px)
  const scale = template.unit === 'mm' ? 2 : 72;
  const previewW = template.orientation === 'landscape' ? template.width * scale : template.height * scale;
  const previewH = template.orientation === 'landscape' ? template.height * scale : template.width * scale;
  const maxPreviewW = 400;
  const scaleFactor = previewW > maxPreviewW ? maxPreviewW / previewW : 1;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Event</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Badge Printing</h1>
            <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveTemplateMutation.mutate(template)}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Save Template
            </button>
            <button
              onClick={handlePrint}
              disabled={printMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {printMutation.isPending ? 'Generating...' : `Print Badges (${printAll ? attendees.length : selectedAttendees.size})`}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Template Editor */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Badge Design</h2>

            {/* Size */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className={smallLabelCls}>Preset Size</label>
                <select
                  value=""
                  onChange={(e) => {
                    const s = BADGE_SIZES.find((b) => b.label === e.target.value);
                    if (s) set({ width: s.width, height: s.height, unit: s.width > 10 ? 'mm' : 'in' });
                  }}
                  className={inputCls}
                >
                  <option value="">Custom</option>
                  {Object.entries(
                    BADGE_SIZES.reduce<Record<string, typeof BADGE_SIZES>>((acc, s) => {
                      (acc[s.group] ||= []).push(s);
                      return acc;
                    }, {})
                  ).map(([group, sizes]) => (
                    <optgroup key={group} label={group}>
                      {sizes.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className={smallLabelCls}>Width</label>
                <input type="number" step="0.1" min="1" value={template.width} onChange={(e) => set({ width: +e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Height</label>
                <input type="number" step="0.1" min="1" value={template.height} onChange={(e) => set({ height: +e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Orientation</label>
                <select value={template.orientation} onChange={(e) => set({ orientation: e.target.value as any })} className={inputCls}>
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <label className={smallLabelCls}>Background</label>
                <input type="color" value={template.backgroundColor} onChange={(e) => set({ backgroundColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className={smallLabelCls}>Name Color</label>
                <input type="color" value={template.nameColor} onChange={(e) => set({ nameColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className={smallLabelCls}>Border Color</label>
                <input type="color" value={template.borderColor} onChange={(e) => set({ borderColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className={smallLabelCls}>Border Width</label>
                <input type="number" min="0" max="10" value={template.borderWidth} onChange={(e) => set({ borderWidth: +e.target.value })} className={inputCls} />
              </div>
            </div>

            {/* Name Size */}
            <div className="mb-4">
              <label className={smallLabelCls}>Name Font Size: {template.nameSize}px</label>
              <input type="range" min="12" max="48" value={template.nameSize} onChange={(e) => set({ nameSize: +e.target.value })} className="w-full" />
            </div>

            {/* Toggle fields */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { key: 'showLogo' as const, label: 'Show Logo' },
                { key: 'showName' as const, label: 'Show Name' },
                { key: 'showEmail' as const, label: 'Show Email' },
                { key: 'showCompany' as const, label: 'Show Company' },
                { key: 'showTicketType' as const, label: 'Show Ticket Type' },
                { key: 'showQrCode' as const, label: 'Show QR Code' },
                { key: 'showPhoto' as const, label: 'Show Photo' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={template[opt.key]}
                    onChange={(e) => set({ [opt.key]: e.target.checked } as any)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {template.showLogo && (
              <div className="mb-4">
                <MediaPicker label="Logo Image" value={template.logoImage} onChange={(v) => set({ logoImage: v })} accept="image/*" />
              </div>
            )}

            <div className="mb-4">
              <MediaPicker label="Background Image" value={template.backgroundImage} onChange={(v) => set({ backgroundImage: v })} accept="image/*" helpText="Optional background image" />
            </div>

            <div>
              <label className={smallLabelCls}>Custom Text (e.g. WiFi password, hashtag)</label>
              <input type="text" value={template.customText} onChange={(e) => set({ customText: e.target.value })} className={inputCls} placeholder="#EventHashtag" />
            </div>
          </div>

          {/* Badge Preview */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Preview</h2>
            <div className="flex justify-center">
              <div
                style={{
                  width: previewW * scaleFactor,
                  height: previewH * scaleFactor,
                  backgroundColor: template.backgroundColor,
                  borderWidth: template.borderWidth,
                  borderColor: template.borderColor,
                  borderStyle: 'solid',
                  backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                }}
                className="rounded-lg shadow-lg flex flex-col items-center justify-center p-4 relative overflow-hidden"
              >
                {template.showLogo && template.logoImage && template.logoPosition === 'top' && (
                  <img src={template.logoImage} alt="Logo" className="h-8 mb-2 object-contain" />
                )}
                {template.showName && (
                  <p style={{ fontSize: template.nameSize * scaleFactor, color: template.nameColor }} className="font-bold text-center">
                    Jane Smith
                  </p>
                )}
                {template.showCompany && (
                  <p className="text-xs text-gray-500 mt-0.5">Acme Corporation</p>
                )}
                {template.showEmail && (
                  <p className="text-[10px] text-gray-400 mt-0.5">jane@example.com</p>
                )}
                {template.showTicketType && (
                  <span className="mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                    VIP Pass
                  </span>
                )}
                {template.showQrCode && (
                  <div className="mt-2">
                    <QRCodeSVG
                      value={`CHECKIN:EVT-${eventId}-SAMPLE`}
                      size={48 * scaleFactor}
                      level="M"
                      bgColor="transparent"
                    />
                  </div>
                )}
                {template.customText && (
                  <p className="absolute bottom-2 text-[9px] text-gray-400">{template.customText}</p>
                )}
                {template.showLogo && template.logoImage && template.logoPosition === 'bottom' && (
                  <img src={template.logoImage} alt="Logo" className="h-8 mt-2 object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendee Selection */}
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Print Selection</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="printScope" checked={printAll} onChange={() => setPrintAll(true)} className="border-gray-300" />
                <span className="text-gray-700">All attendees ({attendees.length})</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="printScope" checked={!printAll} onChange={() => setPrintAll(false)} className="border-gray-300" />
                <span className="text-gray-700">Selected only ({selectedAttendees.size})</span>
              </label>
            </div>

            <div className="mt-4">
              <label className={smallLabelCls}>Filter by Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
                <option value="">All</option>
                <option value="registered">Registered</option>
                <option value="checked_in">Checked In</option>
              </select>
            </div>
          </div>

          {!printAll && (
            <div className="rounded-lg bg-white p-5 shadow max-h-96 overflow-y-auto">
              <h3 className="mb-3 text-xs font-semibold text-gray-700">Select Attendees</h3>
              {attendees.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No attendees found.</p>
              ) : (
                <div className="space-y-1">
                  {attendees.map((a: any) => (
                    <label key={a.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAttendees.has(a.id)}
                        onChange={() => toggleAttendee(a.id)}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{a.name}</p>
                        <p className="text-[10px] text-gray-400">{a.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Badge Cards */}
      {showPreview && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Badge Print Preview ({printAll ? attendees.length : selectedAttendees.size} badges)
            </h2>
            <button onClick={() => setShowPreview(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Hide Preview
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 print:grid-cols-1 print:gap-0">
            {(printAll ? attendees : attendees.filter((a: any) => selectedAttendees.has(a.id))).map((a: any) => (
              <div
                key={a.id}
                style={{
                  width: previewW * scaleFactor,
                  height: previewH * scaleFactor,
                  backgroundColor: template.backgroundColor,
                  borderWidth: template.borderWidth,
                  borderColor: template.borderColor,
                  borderStyle: 'solid',
                  backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                }}
                className="rounded-lg shadow flex flex-col items-center justify-center p-4 relative overflow-hidden print:rounded-none print:shadow-none print:break-inside-avoid print:mb-4"
              >
                {template.showLogo && template.logoImage && template.logoPosition === 'top' && (
                  <img src={template.logoImage} alt="Logo" className="h-8 mb-2 object-contain" />
                )}
                {template.showPhoto && a.photo && (
                  <img src={a.photo} alt="" className="h-12 w-12 rounded-full object-cover mb-1" />
                )}
                {template.showName && (
                  <p style={{ fontSize: template.nameSize * scaleFactor, color: template.nameColor }} className="font-bold text-center">
                    {a.name}
                  </p>
                )}
                {template.showCompany && a.company && (
                  <p className="text-xs text-gray-500 mt-0.5">{a.company}</p>
                )}
                {template.showEmail && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.email}</p>
                )}
                {template.showTicketType && a.ticketTypeName && (
                  <span className="mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                    {a.ticketTypeName}
                  </span>
                )}
                {template.showQrCode && (
                  <div className="mt-2">
                    <QRCodeSVG
                      value={a.confirmationCode || `CHECKIN:${eventId}:${a.id}`}
                      size={48 * scaleFactor}
                      level="M"
                      bgColor="transparent"
                    />
                  </div>
                )}
                {template.customText && (
                  <p className="absolute bottom-2 text-[9px] text-gray-400">{template.customText}</p>
                )}
                {template.showLogo && template.logoImage && template.logoPosition === 'bottom' && (
                  <img src={template.logoImage} alt="Logo" className="h-8 mt-2 object-contain" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview toggle when not shown */}
      {!showPreview && attendees.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Show Badge Preview ({printAll ? attendees.length : selectedAttendees.size} badges)
          </button>
        </div>
      )}
    </div>
  );
}
