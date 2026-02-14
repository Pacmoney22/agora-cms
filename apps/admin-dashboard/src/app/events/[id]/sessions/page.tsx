'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Session {
  id: string;
  title: string;
  description: string;
  type: 'keynote' | 'breakout' | 'workshop' | 'panel' | 'networking' | 'break' | 'other';
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  track: string;
  capacity: number;
  seatingType: 'open' | 'reserved';
  speakers: Speaker[];
  tags: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  surveyId: string;
  dayId: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  image: string;
}

const EMPTY_SESSION = {
  title: '', description: '',
  type: 'breakout' as Session['type'], date: '', startTime: '09:00', endTime: '10:00',
  room: '', track: '', capacity: 0, seatingType: 'open' as Session['seatingType'],
  speakers: [] as Speaker[], tags: [] as string[], status: 'scheduled' as Session['status'],
  surveyId: '', dayId: '',
};

const SESSION_TYPES = [
  { value: 'keynote', label: 'Keynote', color: 'bg-purple-100 text-purple-700' },
  { value: 'breakout', label: 'Breakout', color: 'bg-blue-100 text-blue-700' },
  { value: 'workshop', label: 'Workshop', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'panel', label: 'Panel', color: 'bg-amber-100 text-amber-700' },
  { value: 'networking', label: 'Networking', color: 'bg-pink-100 text-pink-700' },
  { value: 'break', label: 'Break', color: 'bg-gray-100 text-gray-600' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-600' },
];

export default function SessionsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_SESSION);
  const [filterDay, setFilterDay] = useState<string>('');
  const [filterTrack, setFilterTrack] = useState<string>('');

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['events', eventId, 'sessions'],
    queryFn: () => eventsApi.listSessions(eventId),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.createSession(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sessions'] });
      toast.success('Session created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: any }) =>
      eventsApi.updateSession(eventId, sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sessions'] });
      toast.success('Session updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => eventsApi.deleteSession(eventId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'sessions'] });
      toast.success('Session deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_SESSION);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (session: Session) => {
    setForm({
      title: session.title, description: session.description || '',
      type: session.type, date: session.date || '',
      startTime: session.startTime || '09:00', endTime: session.endTime || '10:00',
      room: session.room || '', track: session.track || '',
      capacity: session.capacity || 0, seatingType: session.seatingType || 'open',
      speakers: session.speakers || [], tags: session.tags || [],
      status: session.status || 'scheduled', surveyId: session.surveyId || '',
      dayId: session.dayId || '',
    });
    setEditingId(session.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingId) {
      updateMutation.mutate({ sessionId: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const addSpeaker = () => {
    setForm((f) => ({
      ...f,
      speakers: [...f.speakers, { id: crypto.randomUUID(), name: '', title: '', company: '', bio: '', image: '' }],
    }));
  };

  const updateSpeaker = (id: string, updates: Partial<Speaker>) => {
    setForm((f) => ({ ...f, speakers: f.speakers.map((s) => s.id === id ? { ...s, ...updates } : s) }));
  };

  const removeSpeaker = (id: string) => {
    setForm((f) => ({ ...f, speakers: f.speakers.filter((s) => s.id !== id) }));
  };

  // Derive tracks and days
  const allTracks = [...new Set((sessions as Session[]).map((s) => s.track).filter(Boolean))];
  const conferenceDays = event?.days || [];

  const filtered = (sessions as Session[]).filter((s) => {
    if (filterDay && s.dayId !== filterDay && s.date !== filterDay) return false;
    if (filterTrack && s.track !== filterTrack) return false;
    return true;
  }).sort((a, b) => {
    const dateA = a.date || ''; const dateB = b.date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
  const smallLabelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Event</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
            <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'} — breakout sessions, keynotes, workshops</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Add Session
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{editingId ? 'Edit Session' : 'New Session'}</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={inputCls}>
                {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} />
            </div>
            {conferenceDays.length > 0 && (
              <div>
                <label className={labelCls}>Day</label>
                <select value={form.dayId} onChange={(e) => setForm({ ...form, dayId: e.target.value })} className={inputCls}>
                  <option value="">Select day...</option>
                  {conferenceDays.map((d: any) => <option key={d.id} value={d.id}>{d.label} — {d.date}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Room</label>
              <input type="text" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputCls} placeholder="e.g. Ballroom A" />
            </div>
            <div>
              <label className={labelCls}>Track</label>
              <input type="text" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} className={inputCls} placeholder="e.g. Technical, Business" />
            </div>
            <div>
              <label className={labelCls}>Capacity</label>
              <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Seating</label>
              <select value={form.seatingType} onChange={(e) => setForm({ ...form, seatingType: e.target.value as any })} className={inputCls}>
                <option value="open">Open Seating</option>
                <option value="reserved">Reserved Seating</option>
              </select>
            </div>
          </div>

          {/* Speakers */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>Speakers</label>
              <button type="button" onClick={addSpeaker} className="text-xs text-blue-600 hover:text-blue-800">+ Add Speaker</button>
            </div>
            {form.speakers.length > 0 && (
              <div className="space-y-3">
                {form.speakers.map((speaker) => (
                  <div key={speaker.id} className="rounded-md border border-gray-200 p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={smallLabelCls}>Name</label>
                        <input type="text" value={speaker.name} onChange={(e) => updateSpeaker(speaker.id, { name: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Title</label>
                        <input type="text" value={speaker.title} onChange={(e) => updateSpeaker(speaker.id, { title: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Company</label>
                        <input type="text" value={speaker.company} onChange={(e) => updateSpeaker(speaker.id, { company: e.target.value })} className={inputCls} />
                      </div>
                      <div className="col-span-2">
                        <label className={smallLabelCls}>Bio</label>
                        <textarea value={speaker.bio} onChange={(e) => updateSpeaker(speaker.id, { bio: e.target.value })} rows={2} className={inputCls} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={() => removeSpeaker(speaker.id)} className="mb-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      {(sessions as Session[]).length > 0 && (
        <div className="mb-4 flex gap-3">
          {conferenceDays.length > 0 && (
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">All Days</option>
              {conferenceDays.map((d: any) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
          {allTracks.length > 0 && (
            <select value={filterTrack} onChange={(e) => setFilterTrack(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">All Tracks</option>
              {allTracks.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Sessions List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading sessions...</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((session) => {
            const typeInfo = SESSION_TYPES.find((t) => t.value === session.type) ?? SESSION_TYPES[SESSION_TYPES.length - 1];
            if (!typeInfo) return null;
            return (
              <div key={session.id} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm hover:shadow">
                <div className="w-20 text-center">
                  <p className="text-xs font-medium text-gray-900">{session.startTime}</p>
                  <p className="text-[10px] text-gray-400">{session.endTime}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                    <h3 className="text-sm font-medium text-gray-900">{session.title}</h3>
                  </div>
                  {session.speakers?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{session.speakers.map((s) => s.name).join(', ')}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                    {session.room && <span>Room: {session.room}</span>}
                    {session.track && <span>Track: {session.track}</span>}
                    {session.capacity > 0 && <span>Capacity: {session.capacity}</span>}
                    <span className="capitalize">{session.seatingType} seating</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(session)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => { if (confirm(`Delete "${session.title}"?`)) deleteMutation.mutate(session.id); }} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No sessions yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Add First Session
          </button>
        </div>
      )}

      {(sessions as Session[]).length > 0 && (
        <div className="mt-4 text-xs text-gray-400">
          {(sessions as Session[]).length} session{(sessions as Session[]).length !== 1 ? 's' : ''} total
        </div>
      )}
    </div>
  );
}
