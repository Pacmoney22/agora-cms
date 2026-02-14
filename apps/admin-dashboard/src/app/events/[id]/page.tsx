'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { EventForm } from '@/components/EventForm';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="py-16 text-center text-sm text-gray-400">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8">
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400">Event not found.</p>
          <Link href="/events" className="mt-2 text-sm text-blue-600 hover:text-blue-800">Back to Events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Events</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/events/${id}/attendees`} className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
            Attendees
          </Link>
          <Link href={`/events/${id}/sessions`} className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
            Sessions
          </Link>
          <Link href={`/events/${id}/sponsors`} className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
            Sponsors
          </Link>
          <Link href={`/events/${id}/surveys`} className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
            Surveys
          </Link>
          <Link href={`/events/${id}/badges`} className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200">
            Badges
          </Link>
          <span className="mx-1 text-gray-200">|</span>
          <Link href={`/events/${id}/check-in`} className="rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100">
            Self Check-In
          </Link>
          <Link href={`/events/${id}/session-scanner`} className="rounded-md bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
            Session Scanner
          </Link>
          <Link href={`/events/${id}/exhibitor-scanner`} className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100">
            Exhibitor Scanner
          </Link>
        </div>
      </div>
      <EventForm
        initialData={event}
        onSubmit={(data) => updateMutation.mutate(data)}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
