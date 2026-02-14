'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  sold_out: 'bg-amber-100 text-amber-700',
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  in_person: { label: 'In Person', color: 'bg-emerald-50 text-emerald-700' },
  virtual: { label: 'Virtual', color: 'bg-purple-50 text-purple-700' },
  hybrid: { label: 'Hybrid', color: 'bg-cyan-50 text-cyan-700' },
};

const FORMAT_LABELS: Record<string, string> = {
  single: 'Single Event',
  multi_day: 'Multi-Day',
  conference: 'Conference',
  recurring: 'Recurring',
};

function formatDate(iso: string) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['events', { page, status: statusFilter, type: typeFilter, search: search || undefined }],
    queryFn: () => eventsApi.list({ page, limit: 20, status: statusFilter, type: typeFilter, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => eventsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => eventsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event duplicated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const events = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">Manage events, ticketing, venues, and conferences</p>
        </div>
        <Link
          href="/events/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Event
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search events..."
        />
        <select
          value={statusFilter || ''}
          onChange={(e) => { setStatusFilter(e.target.value || undefined); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
          <option value="sold_out">Sold Out</option>
        </select>
        <select
          value={typeFilter || ''}
          onChange={(e) => { setTypeFilter(e.target.value || undefined); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="in_person">In Person</option>
          <option value="virtual">Virtual</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      {/* Events Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading events...</div>
      ) : events.length ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Event</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Format</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Tickets</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event: any) => {
                const typeInfo = TYPE_LABELS[event.type] || { label: event.type, color: 'bg-gray-50 text-gray-600' };
                return (
                  <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {event.title}
                      </Link>
                      {event.venue && (
                        <p className="text-xs text-gray-400 mt-0.5">{event.venue.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {FORMAT_LABELS[event.format] || event.format}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{formatDate(event.startDate)}</span>
                      {event.endDate && event.endDate !== event.startDate && (
                        <span className="text-xs text-gray-400"> — {formatDate(event.endDate)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {event.ticketsSold ?? 0}/{event.totalCapacity ?? '\u221E'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-600'}`}>
                        {event.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/events/${event.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                          Edit
                        </Link>
                        <button
                          onClick={() => duplicateMutation.mutate(event.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Duplicate
                        </button>
                        {event.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (confirm(`Cancel event "${event.title}"?`)) cancelMutation.mutate(event.id);
                            }}
                            className="text-xs text-amber-500 hover:text-amber-700"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete event "${event.title}"? This cannot be undone.`)) deleteMutation.mutate(event.id);
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search || statusFilter || typeFilter ? 'No events match your filters.' : 'No events yet.'}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <Link
              href="/events/new"
              className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Create Your First Event
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {meta.total} event{meta.total !== 1 ? 's' : ''} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-xs text-gray-500">
              Page {page} of {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
