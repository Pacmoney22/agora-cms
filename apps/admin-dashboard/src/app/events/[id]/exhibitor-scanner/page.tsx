'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

/** Validate URL for safe navigation — only allow http(s) */
function validateNavigationUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

interface Lead {
  id: string;
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  ticketTypeName: string;
  notes: string;
  rating: number;
  scannedAt: string;
}

interface Exhibitor {
  id: string;
  name: string;
  boothNumber: string;
  company: string;
}

export default function ExhibitorScannerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [exhibitorId, setExhibitorId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [searchLeads, setSearchLeads] = useState('');
  const qrRef = useRef<HTMLInputElement>(null);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  // For demo: derive exhibitors from event data or a dedicated API
  // In practice this would come from eventsApi.listExhibitors
  const exhibitors: Exhibitor[] = (event as any)?.exhibitors || [];

  const { data: leadsData, refetch: refetchLeads } = useQuery({
    queryKey: ['events', eventId, 'exhibitors', exhibitorId, 'leads'],
    queryFn: () => eventsApi.getExhibitorLeads(eventId, exhibitorId),
    enabled: !!eventId && !!exhibitorId,
  });

  const leads: Lead[] = leadsData || [];

  const filteredLeads = searchLeads
    ? leads.filter((l) =>
        l.name?.toLowerCase().includes(searchLeads.toLowerCase()) ||
        l.email?.toLowerCase().includes(searchLeads.toLowerCase()) ||
        l.company?.toLowerCase().includes(searchLeads.toLowerCase())
      )
    : leads;

  const scanMutation = useMutation({
    mutationFn: (data: { qrCode: string; notes?: string; rating?: number }) =>
      eventsApi.exhibitorScanLead(eventId, exhibitorId, data),
    onSuccess: (data: any) => {
      toast.success(`Lead captured: ${data?.name || 'Contact saved'}`);
      refetchLeads();
      setQrInput('');
      setNotes('');
      setRating(0);
      qrRef.current?.focus();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setQrInput('');
      qrRef.current?.focus();
    },
  });

  const handleScan = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!qrInput.trim() || !exhibitorId) return;
    scanMutation.mutate({ qrCode: qrInput.trim(), notes: notes.trim() || undefined, rating: rating || undefined });
  };

  const handleQrKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrInput.trim()) {
      e.preventDefault();
      handleScan();
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    eventsApi.exportExhibitorLeads(eventId, exhibitorId, format)
      .then((result: any) => {
        if (result?.url) {
          const safeUrl = validateNavigationUrl(result.url);
          if (safeUrl) {
            window.open(safeUrl, '_blank', 'noopener,noreferrer');
          }
          toast.success(`Leads exported as ${format.toUpperCase()}`);
        } else if (result?.data) {
          // Direct download
          const blob = new Blob(
            [format === 'json' ? JSON.stringify(result.data, null, 2) : result.data],
            { type: format === 'json' ? 'application/json' : 'text/csv' }
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `leads-${exhibitorId}.${format}`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Leads exported as ${format.toUpperCase()}`);
        }
      })
      .catch((err: Error) => toast.error(err.message));
  };

  useEffect(() => {
    if (exhibitorId && qrRef.current) qrRef.current.focus();
  }, [exhibitorId]);

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  const StarRating = ({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? 0 : star)}
          className={`${size === 'sm' ? 'text-sm' : 'text-xl'} transition-colors ${star <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">
          &larr; Back to Event
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Exhibitor Lead Scanner</h1>
        <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'} — Scan attendee badges to capture leads</p>
      </div>

      {/* Exhibitor Selector */}
      <div className="mb-6 rounded-lg bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-medium text-gray-700">Select Your Booth / Company</label>
        {exhibitors.length > 0 ? (
          <select
            value={exhibitorId}
            onChange={(e) => { setExhibitorId(e.target.value); }}
            className={inputCls}
          >
            <option value="">— Select exhibitor —</option>
            {exhibitors.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} {ex.boothNumber ? `(Booth ${ex.boothNumber})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div>
            <input
              type="text"
              value={exhibitorId}
              onChange={(e) => setExhibitorId(e.target.value)}
              className={inputCls}
              placeholder="Enter your exhibitor ID"
            />
            <p className="mt-1 text-xs text-gray-400">Enter the exhibitor ID provided by event staff.</p>
          </div>
        )}
      </div>

      {exhibitorId && (
        <div className="grid grid-cols-3 gap-6">
          {/* Scanner + Notes */}
          <div className="col-span-2 space-y-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Scan Attendee Badge</h2>
              <form onSubmit={handleScan}>
                <div className="flex gap-3">
                  <input
                    ref={qrRef}
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={handleQrKeyDown}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-lg font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Scan badge QR code..."
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={scanMutation.isPending || !qrInput.trim()}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {scanMutation.isPending ? 'Saving...' : 'Capture Lead'}
                  </button>
                </div>

                {/* Optional notes + rating before scan */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-gray-500">Quick Notes (optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={inputCls}
                      placeholder="Interested in product X..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-gray-500">Lead Rating (optional)</label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                </div>
              </form>
            </div>

            {/* Leads Table */}
            <div className="rounded-lg bg-white p-5 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Captured Leads ({leads.length})</h2>
                <div className="flex gap-2">
                  {leads.length > 0 && (
                    <>
                      <button
                        onClick={() => handleExport('csv')}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Export JSON
                      </button>
                    </>
                  )}
                </div>
              </div>

              {leads.length > 5 && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchLeads}
                    onChange={(e) => setSearchLeads(e.target.value)}
                    className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Search leads..."
                  />
                </div>
              )}

              {filteredLeads.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
                  <p className="text-sm text-gray-400">
                    {leads.length === 0 ? 'No leads captured yet. Start scanning badges!' : `No leads match "${searchLeads}"`}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left">
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Contact</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Company</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Rating</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Notes</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Scanned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-900">{lead.name}</p>
                            <p className="text-[10px] text-gray-400">{lead.email}</p>
                            {lead.phone && <p className="text-[10px] text-gray-400">{lead.phone}</p>}
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs text-gray-600">{lead.company || '\u2014'}</span>
                          </td>
                          <td className="px-4 py-2">
                            {lead.rating ? (
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className={`text-xs ${s <= lead.rating ? 'text-amber-400' : 'text-gray-200'}`}>&#9733;</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300">\u2014</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs text-gray-500 truncate max-w-xs block">{lead.notes || '\u2014'}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[10px] text-gray-400">
                              {new Date(lead.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Lead Summary</h3>
              <div className="space-y-3">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-3xl font-bold text-blue-700">{leads.length}</p>
                  <p className="text-xs text-blue-500">total leads</p>
                </div>
                {leads.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-amber-50 p-2 text-center">
                        <p className="text-lg font-bold text-amber-700">
                          {leads.filter((l) => l.rating >= 4).length}
                        </p>
                        <p className="text-[10px] text-amber-500">hot leads</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-2 text-center">
                        <p className="text-lg font-bold text-gray-700">
                          {leads.filter((l) => l.rating && l.rating > 0).length}
                        </p>
                        <p className="text-[10px] text-gray-500">rated</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-2 text-center">
                      <p className="text-lg font-bold text-green-700">
                        {leads.filter((l) => l.notes).length}
                      </p>
                      <p className="text-[10px] text-green-500">with notes</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={leads.length === 0}
                  className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Download All Leads (CSV)
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={leads.length === 0}
                  className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Download All Leads (JSON)
                </button>
                <button
                  onClick={() => refetchLeads()}
                  className="w-full rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Refresh Leads
                </button>
              </div>
            </div>

            {/* Recent Scans */}
            {leads.length > 0 && (
              <div className="rounded-lg bg-white p-5 shadow">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Scans</h3>
                <div className="space-y-1">
                  {leads.slice(0, 10).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-50">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{lead.name}</p>
                        <p className="text-[10px] text-gray-400">{lead.company || lead.email}</p>
                      </div>
                      {lead.rating > 0 && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={`text-[8px] ${s <= lead.rating ? 'text-amber-400' : 'text-gray-200'}`}>&#9733;</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!exhibitorId && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Select your booth above to start scanning attendee badges.</p>
        </div>
      )}
    </div>
  );
}
