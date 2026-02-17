import React from 'react';
import { clsx } from 'clsx';
import { Calendar, MapPin, Ticket, Clock } from 'lucide-react';

export interface EventData {
  title: string;
  startDate: string;
  endDate?: string;
  venue?: string;
  location?: string;
  description?: string;
  image?: string;
  ticketPriceMin?: number;
  ticketPriceMax?: number;
  status?: 'upcoming' | 'ongoing' | 'past' | 'cancelled' | 'sold-out';
  slug: string;
}

export interface EventCardProps {
  eventId?: string | null;
  eventData?: EventData | null;
  detailBasePath?: string;
  cardStyle?: 'standard' | 'compact' | 'featured';
  showDate?: boolean;
  showVenue?: boolean;
  showTicketPrice?: boolean;
  showStatus?: boolean;
  showImage?: boolean;
  className?: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ongoing: { bg: 'bg-green-100', text: 'text-green-700' },
  past: { bg: 'bg-gray-100', text: 'text-gray-600' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  'sold-out': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

function formatEventDate(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const startStr = start.toLocaleDateString('en-US', options);

  if (!endDate) return startStr;

  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) {
    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    return `${startStr}, ${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
  }

  return `${startStr} - ${end.toLocaleDateString('en-US', options)}`;
}

function formatPrice(min?: number, max?: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (min == null && max == null) return 'Free';
  if (min === 0 && (max == null || max === 0)) return 'Free';
  if (min != null && max != null && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min ?? max ?? 0);
}

export const EventCard: React.FC<EventCardProps> = ({
  eventData: eventDataProp = null,
  detailBasePath = '/events',
  cardStyle = 'standard',
  showDate = true,
  showVenue = true,
  showTicketPrice = true,
  showStatus = true,
  showImage = true,
  className,
}) => {
  const sampleEvent: EventData = {
    title: 'Sample Event',
    startDate: new Date().toISOString(),
    venue: 'Event Venue',
    status: 'upcoming',
    slug: 'sample-event',
  };

  const eventData = eventDataProp ?? sampleEvent;

  const status = eventData.status ?? 'upcoming';
  const statusStyle = statusColors[status] ?? { bg: 'bg-blue-100', text: 'text-blue-700' };

  if (cardStyle === 'compact') {
    return (
      <a
        href={`${detailBasePath}/${eventData.slug}`}
        className={clsx(
          'group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md',
          className,
        )}
      >
        {/* Date block */}
        {showDate && eventData.startDate && (
          <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <span className="text-xs font-medium uppercase">
              {new Date(eventData.startDate).toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-lg font-bold leading-tight">
              {new Date(eventData.startDate).getDate()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600">
            {eventData.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            {showVenue && eventData.venue && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {eventData.venue}
              </span>
            )}
            {showTicketPrice && (
              <span className="inline-flex items-center gap-1">
                <Ticket className="h-3 w-3 flex-shrink-0" />
                {formatPrice(eventData.ticketPriceMin, eventData.ticketPriceMax)}
              </span>
            )}
          </div>
        </div>
        {showStatus && (
          <span
            className={clsx(
              'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
              statusStyle.bg,
              statusStyle.text,
            )}
          >
            {status.replace('-', ' ')}
          </span>
        )}
      </a>
    );
  }

  if (cardStyle === 'featured') {
    return (
      <a
        href={`${detailBasePath}/${eventData.slug}`}
        className={clsx(
          'group relative block overflow-hidden rounded-xl',
          className,
        )}
      >
        {showImage && eventData.image ? (
          <img
            src={eventData.image}
            alt={eventData.title}
            className="aspect-[2/1] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <Calendar className="h-16 w-16 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          {showStatus && (
            <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium capitalize backdrop-blur-sm">
              {status.replace('-', ' ')}
            </span>
          )}
          <h3 className="mb-2 text-xl font-bold leading-tight">{eventData.title}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            {showDate && eventData.startDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatEventDate(eventData.startDate, eventData.endDate)}
              </span>
            )}
            {showVenue && eventData.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {eventData.venue}
              </span>
            )}
          </div>
        </div>
      </a>
    );
  }

  // Standard card
  return (
    <a
      href={`${detailBasePath}/${eventData.slug}`}
      className={clsx(
        'group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      {showImage && (
        <div className="relative overflow-hidden">
          {eventData.image ? (
            <img
              src={eventData.image}
              alt={eventData.title}
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
              <Calendar className="h-12 w-12 text-blue-300" />
            </div>
          )}
          {showStatus && (
            <span
              className={clsx(
                'absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                statusStyle.bg,
                statusStyle.text,
              )}
            >
              {status.replace('-', ' ')}
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
          {eventData.title}
        </h3>
        <div className="space-y-1.5 text-sm text-gray-500">
          {showDate && eventData.startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{formatEventDate(eventData.startDate, eventData.endDate)}</span>
            </div>
          )}
          {showVenue && eventData.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{eventData.venue}{eventData.location ? `, ${eventData.location}` : ''}</span>
            </div>
          )}
          {showTicketPrice && (
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{formatPrice(eventData.ticketPriceMin, eventData.ticketPriceMax)}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-700">
            View Details
            <Clock className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
};
