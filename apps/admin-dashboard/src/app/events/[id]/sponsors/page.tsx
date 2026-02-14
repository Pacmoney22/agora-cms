'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Sponsor {
  id: string;
  name: string;
  tier: 'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';
  logo: string;
  website: string;
  description: string;
  contactName: string;
  contactEmail: string;
  amount: number;
  currency: string;
  benefits: string;
  booth: string;
  socialMedia: { twitter: string; linkedin: string };
  featured: boolean;
  order: number;
}

const TIERS = [
  { value: 'title', label: 'Title Sponsor', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'platinum', label: 'Platinum', color: 'bg-gray-100 text-gray-800 border-gray-400' },
  { value: 'gold', label: 'Gold', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'silver', label: 'Silver', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'bronze', label: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'community', label: 'Community', color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

const EMPTY_FORM = {
  name: '', tier: 'gold' as Sponsor['tier'], logo: '', website: '', description: '',
  contactName: '', contactEmail: '', amount: 0, currency: 'USD',
  benefits: '', booth: '', twitter: '', linkedin: '', featured: false, order: 0,
};

export default function SponsorsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['events', eventId, 'sponsors'],
    queryFn: () => eventsApi.listSponsors(eventId),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.createSponsor(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sponsors'] });
      toast.success('Sponsor added');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ sponsorId, data }: { sponsorId: string; data: any }) =>
      eventsApi.updateSponsor(eventId, sponsorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sponsors'] });
      toast.success('Sponsor updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (sponsorId: string) => eventsApi.deleteSponsor(eventId, sponsorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sponsors'] });
      toast.success('Sponsor removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (sponsor: Sponsor) => {
    setForm({
      name: sponsor.name, tier: sponsor.tier, logo: sponsor.logo || '',
      website: sponsor.website || '', description: sponsor.description || '',
      contactName: sponsor.contactName || '', contactEmail: sponsor.contactEmail || '',
      amount: sponsor.amount || 0, currency: sponsor.currency || 'USD',
      benefits: sponsor.benefits || '', booth: sponsor.booth || '',
      twitter: sponsor.socialMedia?.twitter || '', linkedin: sponsor.socialMedia?.linkedin || '',
      featured: sponsor.featured || false, order: sponsor.order || 0,
    });
    setEditingId(sponsor.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      socialMedia: { twitter: form.twitter, linkedin: form.linkedin },
    };
    if (editingId) {
      updateMutation.mutate({ sponsorId: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

  // Group by tier
  const grouped = TIERS.map((tier) => ({
    ...tier,
    sponsors: (sponsors as Sponsor[]).filter((s) => s.tier === tier.value).sort((a, b) => (a.order || 0) - (b.order || 0)),
  })).filter((g) => g.sponsors.length > 0);

  const totalAmount = (sponsors as Sponsor[]).reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Event</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sponsors</h1>
            <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'}</p>
          </div>
          <div className="flex items-center gap-3">
            {totalAmount > 0 && (
              <span className="text-sm text-gray-500">
                Total: <span className="font-semibold text-gray-900">${totalAmount.toLocaleString()}</span>
              </span>
            )}
            <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add Sponsor
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{editingId ? 'Edit Sponsor' : 'New Sponsor'}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Company Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tier</label>
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as any })} className={inputCls}>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sponsorship Amount</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Contact Name</label>
              <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Benefits</label>
              <textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={2} className={inputCls} placeholder="Logo on website, booth, speaking slot..." />
            </div>
            <div>
              <label className={labelCls}>Booth Location</label>
              <input type="text" value={form.booth} onChange={(e) => setForm({ ...form, booth: e.target.value })} className={inputCls} placeholder="e.g. Booth #12" />
            </div>
            <div>
              <label className={labelCls}>Display Order</label>
              <input type="number" min="0" value={form.order} onChange={(e) => setForm({ ...form, order: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Twitter</label>
              <input type="text" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} className={inputCls} placeholder="@handle" />
            </div>
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input type="url" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className={inputCls} placeholder="https://linkedin.com/company/..." />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-gray-700">Featured sponsor</span>
              </label>
            </div>
            <div className="col-span-3">
              <MediaPicker label="Company Logo" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} accept="image/*" helpText="Transparent PNG recommended" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Add Sponsor'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Sponsors by Tier */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading sponsors...</div>
      ) : grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.value}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{group.label} ({group.sponsors.length})</h3>
              <div className="grid grid-cols-2 gap-3">
                {group.sponsors.map((sponsor) => (
                  <div key={sponsor.id} className={`rounded-lg border p-4 ${group.color}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {sponsor.logo && (
                          <img src={sponsor.logo} alt={sponsor.name} className="h-10 w-10 rounded object-contain bg-white p-1" />
                        )}
                        <div>
                          <h4 className="text-sm font-semibold">{sponsor.name}</h4>
                          {sponsor.website && <p className="text-[10px] opacity-70">{sponsor.website}</p>}
                        </div>
                      </div>
                      {sponsor.featured && (
                        <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-[9px] font-bold text-yellow-800">FEATURED</span>
                      )}
                    </div>
                    {sponsor.amount > 0 && (
                      <p className="mt-2 text-xs font-medium">${sponsor.amount.toLocaleString()}</p>
                    )}
                    {sponsor.description && (
                      <p className="mt-1 text-xs opacity-80 line-clamp-2">{sponsor.description}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => startEdit(sponsor)} className="text-xs font-medium opacity-70 hover:opacity-100">Edit</button>
                      <button onClick={() => { if (confirm(`Remove "${sponsor.name}"?`)) deleteMutation.mutate(sponsor.id); }} className="text-xs font-medium text-red-600 opacity-70 hover:opacity-100">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No sponsors yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Add First Sponsor
          </button>
        </div>
      )}
    </div>
  );
}
