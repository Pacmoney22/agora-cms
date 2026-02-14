'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  ticketTypeName: string;
  confirmationCode: string;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  checkedInAt: string;
  seatAssignment: string;
  orderId: string;
  registeredAt: string;
  customFields: Record<string, string>;
}

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  position: number;
  joinedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-amber-100 text-amber-700',
};

export default function AttendeesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ticketFilter, setTicketFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrAttendee, setQrAttendee] = useState<Attendee | null>(null);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const { data: attendeesData, isLoading } = useQuery({
    queryKey: ['events', eventId, 'attendees', { page, status: statusFilter || undefined, ticketTypeId: ticketFilter || undefined }],
    queryFn: () => eventsApi.listAttendees(eventId, {
      page, limit: 50,
      status: statusFilter || undefined,
      ticketTypeId: ticketFilter || undefined,
    }),
    enabled: !!eventId,
  });

  const { data: waitlist = [] } = useQuery({
    queryKey: ['events', eventId, 'waitlist'],
    queryFn: () => eventsApi.listWaitlist(eventId),
    enabled: !!eventId && showWaitlist,
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ['events', eventId, 'ticket-types'],
    queryFn: () => eventsApi.listTicketTypes(eventId),
    enabled: !!eventId,
  });

  const checkInMutation = useMutation({
    mutationFn: (attendeeId: string) => eventsApi.checkIn(eventId, attendeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'attendees'] });
      toast.success('Checked in');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: (attendeeId: string) => eventsApi.checkOut(eventId, attendeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'attendees'] });
      toast.success('Checked out');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const promoteMutation = useMutation({
    mutationFn: (waitlistId: string) => eventsApi.promoteWaitlist(eventId, waitlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'attendees'] });
      toast.success('Promoted from waitlist');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const attendees: Attendee[] = attendeesData?.data || [];
  const meta = attendeesData?.meta;

  const filteredAttendees = search
    ? attendees.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
    : attendees;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filteredAttendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAttendees.map((a) => a.id)));
    }
  };

  const bulkCheckIn = () => {
    selectedIds.forEach((id) => checkInMutation.mutate(id));
    setSelectedIds(new Set());
  };

  // Stats
  const totalRegistered = attendees.filter((a) => a.status !== 'cancelled').length;
  const totalCheckedIn = attendees.filter((a) => a.status === 'checked_in').length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Event</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendees</h1>
            <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWaitlist(!showWaitlist)}
              className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              {showWaitlist ? 'Hide Waitlist' : 'View Waitlist'}
            </button>
            <Link
              href={`/events/${eventId}/badges`}
              className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Print Badges
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium text-gray-500 uppercase">Total Registered</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{meta?.total ?? totalRegistered}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium text-gray-500 uppercase">Checked In</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalCheckedIn}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium text-gray-500 uppercase">Check-in Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {totalRegistered ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0}%
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-[10px] font-medium text-gray-500 uppercase">Waitlist</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{(waitlist as WaitlistEntry[]).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search by name or email..."
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
        {(ticketTypes as any[]).length > 0 && (
          <select value={ticketFilter} onChange={(e) => { setTicketFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All Ticket Types</option>
            {(ticketTypes as any[]).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {selectedIds.size > 0 && (
          <button onClick={bulkCheckIn} className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">
            Check In Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Attendees Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading attendees...</div>
      ) : filteredAttendees.length > 0 ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.size === filteredAttendees.length && filteredAttendees.length > 0} onChange={toggleAll} className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Attendee</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Ticket</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Seat</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">QR</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Registered</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((attendee) => (
                <tr key={attendee.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(attendee.id)} onChange={() => toggleSelect(attendee.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{attendee.name}</p>
                      <p className="text-xs text-gray-400">{attendee.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{attendee.ticketTypeName || attendee.ticketType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-500">{attendee.seatAssignment || '\u2014'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[attendee.status] || 'bg-gray-100 text-gray-600'}`}>
                      {attendee.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setQrAttendee(qrAttendee?.id === attendee.id ? null : attendee)}
                      className="inline-flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="View QR Code"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75H16.5v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {attendee.registeredAt ? new Date(attendee.registeredAt).toLocaleDateString() : '\u2014'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {attendee.status === 'registered' && (
                        <button onClick={() => checkInMutation.mutate(attendee.id)} className="text-xs text-green-600 hover:text-green-800">
                          Check In
                        </button>
                      )}
                      {attendee.status === 'checked_in' && (
                        <button onClick={() => checkOutMutation.mutate(attendee.id)} className="text-xs text-amber-600 hover:text-amber-800">
                          Check Out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No attendees yet.</p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">{meta.total} attendee{meta.total !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">Previous</button>
            <span className="px-2 py-1 text-xs text-gray-500">Page {page} of {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQrAttendee(null)}>
          <div className="rounded-xl bg-white p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Attendee QR Code</h3>
              <button onClick={() => setQrAttendee(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-block rounded-lg border border-gray-200 bg-white p-4">
                <QRCodeSVG
                  value={qrAttendee.confirmationCode || `CHECKIN:${eventId}:${qrAttendee.id}`}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{qrAttendee.name}</p>
                <p className="text-xs text-gray-500">{qrAttendee.email}</p>
                {qrAttendee.ticketTypeName && (
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {qrAttendee.ticketTypeName}
                  </span>
                )}
              </div>
              {qrAttendee.confirmationCode && (
                <p className="font-mono text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                  {qrAttendee.confirmationCode}
                </p>
              )}
              <p className="text-[10px] text-gray-400">
                Scan this QR code at check-in stations or session scanners
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist */}
      {showWaitlist && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Waitlist</h2>
          {(waitlist as WaitlistEntry[]).length === 0 ? (
            <p className="text-sm text-gray-400">No one on the waitlist.</p>
          ) : (
            <div className="rounded-lg bg-white shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Ticket Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(waitlist as WaitlistEntry[]).map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{entry.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{entry.ticketType}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{entry.joinedAt ? new Date(entry.joinedAt).toLocaleDateString() : '\u2014'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => promoteMutation.mutate(entry.id)} className="text-xs text-green-600 hover:text-green-800">
                          Promote to Attendee
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
