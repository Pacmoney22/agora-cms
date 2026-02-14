'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import toast from 'react-hot-toast';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  capacity: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  description: string;
  image: string;
  mapImage: string;
  amenities: string[];
  parkingInfo: string;
  accessibilityInfo: string;
  rooms: VenueRoom[];
}

interface VenueRoom {
  id: string;
  name: string;
  capacity: number;
  setup: string;
  equipment: string;
}

const EMPTY_FORM = {
  name: '', address: '', city: '', state: '', zip: '', country: 'US',
  capacity: 0, contactName: '', contactEmail: '', contactPhone: '', website: '',
  description: '', image: '', mapImage: '', amenities: [] as string[],
  parkingInfo: '', accessibilityInfo: '', rooms: [] as VenueRoom[],
};

const AMENITY_OPTIONS = [
  'WiFi', 'Parking', 'AV Equipment', 'Catering', 'Stage', 'Green Room',
  'Loading Dock', 'Wheelchair Access', 'Elevator', 'Kitchen', 'Bar',
  'Outdoor Space', 'Breakout Rooms', 'Coat Check',
];

export default function VenuesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: () => eventsApi.listVenues({ limit: 100 }),
  });

  const venues: Venue[] = data?.data || [];
  const filtered = search
    ? venues.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase()))
    : venues;

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.createVenue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Venue created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => eventsApi.updateVenue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Venue updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Venue deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (venue: Venue) => {
    setForm({
      name: venue.name || '', address: venue.address || '', city: venue.city || '',
      state: venue.state || '', zip: venue.zip || '', country: venue.country || 'US',
      capacity: venue.capacity || 0, contactName: venue.contactName || '',
      contactEmail: venue.contactEmail || '', contactPhone: venue.contactPhone || '',
      website: venue.website || '', description: venue.description || '',
      image: venue.image || '', mapImage: venue.mapImage || '',
      amenities: venue.amenities || [], parkingInfo: venue.parkingInfo || '',
      accessibilityInfo: venue.accessibilityInfo || '', rooms: venue.rooms || [],
    });
    setEditingId(venue.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const addRoom = () => {
    setForm((f) => ({
      ...f,
      rooms: [...f.rooms, { id: crypto.randomUUID(), name: '', capacity: 0, setup: 'theater', equipment: '' }],
    }));
  };

  const updateRoom = (id: string, updates: Partial<VenueRoom>) => {
    setForm((f) => ({
      ...f,
      rooms: f.rooms.map((r) => r.id === id ? { ...r, ...updates } : r),
    }));
  };

  const removeRoom = (id: string) => {
    setForm((f) => ({ ...f, rooms: f.rooms.filter((r) => r.id !== id) }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="mt-1 text-sm text-gray-500">Manage reusable venue locations for events</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add Venue
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{editingId ? 'Edit Venue' : 'New Venue'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Venue Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Venue name" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Street Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Zip</label>
              <input type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Total Capacity</label>
              <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} placeholder="https://..." />
            </div>
          </div>

          {/* Contact */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} />
          </div>

          {/* Amenities */}
          <div className="mt-4">
            <label className={labelCls}>Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
                    }));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Parking Info</label>
              <textarea value={form.parkingInfo} onChange={(e) => setForm({ ...form, parkingInfo: e.target.value })} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Accessibility Info</label>
              <textarea value={form.accessibilityInfo} onChange={(e) => setForm({ ...form, accessibilityInfo: e.target.value })} rows={2} className={inputCls} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <MediaPicker label="Venue Photo" value={form.image} onChange={(v) => setForm({ ...form, image: v })} accept="image/*" />
            <MediaPicker label="Floor Plan / Map" value={form.mapImage} onChange={(v) => setForm({ ...form, mapImage: v })} accept="image/*" />
          </div>

          {/* Rooms */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>Rooms / Halls</label>
              <button type="button" onClick={addRoom} className="text-xs text-blue-600 hover:text-blue-800">+ Add Room</button>
            </div>
            {form.rooms.length > 0 && (
              <div className="space-y-2">
                {form.rooms.map((room) => (
                  <div key={room.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <div>
                        <input type="text" value={room.name} onChange={(e) => updateRoom(room.id, { name: e.target.value })} className={inputCls} placeholder="Room name" />
                      </div>
                      <div>
                        <input type="number" min="0" value={room.capacity} onChange={(e) => updateRoom(room.id, { capacity: +e.target.value })} className={inputCls} placeholder="Capacity" />
                      </div>
                      <div>
                        <select value={room.setup} onChange={(e) => updateRoom(room.id, { setup: e.target.value })} className={inputCls}>
                          <option value="theater">Theater</option>
                          <option value="classroom">Classroom</option>
                          <option value="boardroom">Boardroom</option>
                          <option value="banquet">Banquet</option>
                          <option value="u_shape">U-Shape</option>
                          <option value="cabaret">Cabaret</option>
                        </select>
                      </div>
                      <div>
                        <input type="text" value={room.equipment} onChange={(e) => updateRoom(room.id, { equipment: e.target.value })} className={inputCls} placeholder="Equipment (projector, mic...)" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeRoom(room.id)} className="text-red-400 hover:text-red-600">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      {venues.length > 5 && (
        <div className="mb-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Search venues..." />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading venues...</div>
      ) : filtered.length ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Venue</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Location</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Capacity</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Rooms</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((venue) => (
                <tr key={venue.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{venue.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{[venue.city, venue.state].filter(Boolean).join(', ') || '\u2014'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{venue.capacity || '\u2014'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{venue.rooms?.length || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(venue)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => { if (confirm(`Delete "${venue.name}"?`)) deleteMutation.mutate(venue.id); }} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : venues.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No venues yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Add Your First Venue
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No venues match &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
