'use client';

import { useMutation } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import { EventForm } from '@/components/EventForm';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function NewEventPage() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.create(data),
    onSuccess: (result) => {
      toast.success('Event created');
      router.push(`/events/${result.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
        <p className="mt-1 text-sm text-gray-500">Set up a new event with ticketing, venue, and scheduling</p>
      </div>
      <EventForm onSubmit={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
    </div>
  );
}
