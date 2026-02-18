import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  Users,
  Minus,
  Plus,
  ExternalLink,
  Tag,
  Video,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TicketTier {
  name: string;
  price: number;
  description?: string;
  available: number;
  maxPerOrder?: number;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

export interface Speaker {
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
}

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

  // Detail-mode fields
  id?: string;
  timezone?: string;
  bannerUrl?: string;
  virtualEventUrl?: string;
  isExternalRegistration?: boolean;
  externalRegistrationUrl?: string;
  maxAttendees?: number | null;
  tags?: string[];
  ticketTiers?: TicketTier[];
  schedule?: ScheduleItem[];
  speakers?: Speaker[];
}

export interface EventCardProps {
  eventId?: string | null;
  eventData?: EventData | null;
  detailBasePath?: string;

  /** Display mode — 'card' for compact grid view, 'detail' for full event view. */
  mode?: 'card' | 'detail';

  // Card-mode props
  cardStyle?: 'standard' | 'compact' | 'featured';
  showDate?: boolean;
  showVenue?: boolean;
  showTicketPrice?: boolean;
  showStatus?: boolean;
  showImage?: boolean;

  // Detail-mode props
  showFullDescription?: boolean;
  showTickets?: boolean;
  showSchedule?: boolean;
  showSpeakers?: boolean;
  showRegistrationForm?: boolean;
  onRegister?: (ticketSelections: Record<string, number>) => void;

  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatEventDateTime(dateStr: string, timezone?: string): string {
  const date = new Date(dateStr);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  if (timezone) opts.timeZone = timezone;
  return date.toLocaleString('en-US', opts);
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatPrice(min?: number, max?: number): string {
  if (min == null && max == null) return 'Free';
  if (min === 0 && (max == null || max === 0)) return 'Free';
  if (min != null && max != null && min !== max) return `${fmtPrice(min)} - ${fmtPrice(max)}`;
  return fmtPrice(min ?? max ?? 0);
}

// ---------------------------------------------------------------------------
// Detail View
// ---------------------------------------------------------------------------

function EventDetailView({
  eventData,
  showImage,
  showDate,
  showVenue,
  showStatus,
  showFullDescription,
  showTickets,
  showSchedule,
  showSpeakers,
  showRegistrationForm,
  onRegister,
  className,
}: {
  eventData: EventData;
  showImage: boolean;
  showDate: boolean;
  showVenue: boolean;
  showStatus: boolean;
  showFullDescription: boolean;
  showTickets: boolean;
  showSchedule: boolean;
  showSpeakers: boolean;
  showRegistrationForm: boolean;
  onRegister?: (ticketSelections: Record<string, number>) => void;
  className?: string;
}) {
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});

  const status = eventData.status ?? 'upcoming';
  const statusStyle = statusColors[status] ?? statusColors.upcoming!;

  const totalTicketCost = useMemo(() => {
    if (!eventData.ticketTiers) return 0;
    let total = 0;
    for (const tier of eventData.ticketTiers) {
      const qty = ticketSelections[tier.name] ?? 0;
      total += tier.price * qty;
    }
    return total;
  }, [eventData.ticketTiers, ticketSelections]);

  const totalTicketCount = useMemo(() => {
    return Object.values(ticketSelections).reduce((sum, qty) => sum + qty, 0);
  }, [ticketSelections]);

  const updateTicketQty = (tierName: string, delta: number, max?: number) => {
    setTicketSelections((prev) => {
      const current = prev[tierName] ?? 0;
      const next = Math.max(0, current + delta);
      const capped = max != null ? Math.min(next, max) : next;
      return { ...prev, [tierName]: capped };
    });
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Banner */}
      {showImage && (eventData.bannerUrl || eventData.image) && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={eventData.bannerUrl || eventData.image}
            alt={eventData.title}
            className="aspect-[2.5/1] w-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="text-3xl font-bold text-gray-900">{eventData.title}</h1>
        {showStatus && (
          <span
            className={clsx(
              'mt-1 inline-flex rounded-full px-3 py-0.5 text-xs font-medium capitalize',
              statusStyle.bg,
              statusStyle.text,
            )}
          >
            {status.replace('-', ' ')}
          </span>
        )}
      </div>

      {/* Date & time */}
      {showDate && (
        <div className="mt-4 space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatEventDateTime(eventData.startDate, eventData.timezone)}</span>
          </div>
          {eventData.endDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Ends: {formatEventDateTime(eventData.endDate, eventData.timezone)}</span>
            </div>
          )}
        </div>
      )}

      {/* Key info bar */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        {showVenue && eventData.venue && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gray-400" />
            {eventData.venue}
            {eventData.location ? `, ${eventData.location}` : ''}
          </span>
        )}
        {eventData.virtualEventUrl && (
          <span className="inline-flex items-center gap-1.5 text-blue-600">
            <Video className="h-4 w-4" />
            Virtual Event
          </span>
        )}
        {eventData.ticketPriceMin != null && (
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-4 w-4 text-gray-400" />
            {formatPrice(eventData.ticketPriceMin, eventData.ticketPriceMax)}
          </span>
        )}
        {eventData.maxAttendees != null && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-400" />
            {eventData.maxAttendees} max attendees
          </span>
        )}
      </div>

      {/* Description */}
      {showFullDescription && eventData.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">About This Event</h2>
          <p className="mt-2 whitespace-pre-line text-gray-700">{eventData.description}</p>
        </div>
      )}

      {/* Ticket tiers */}
      {showTickets &&
        eventData.ticketTiers &&
        eventData.ticketTiers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Tickets</h2>
            <div className="mt-4 space-y-3">
              {eventData.ticketTiers.map((tier) => (
                <div
                  key={tier.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{tier.name}</h3>
                    {tier.description && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {tier.description}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {tier.price === 0 ? 'Free' : fmtPrice(tier.price)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tier.available} available
                    </p>
                  </div>
                  <div className="flex items-center rounded-md border border-gray-300">
                    <button
                      onClick={() => updateTicketQty(tier.name, -1)}
                      className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100"
                      aria-label={`Decrease ${tier.name} quantity`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-9 w-10 items-center justify-center border-x border-gray-300 text-sm font-medium">
                      {ticketSelections[tier.name] ?? 0}
                    </span>
                    <button
                      onClick={() =>
                        updateTicketQty(tier.name, 1, tier.maxPerOrder ?? tier.available)
                      }
                      className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100"
                      aria-label={`Increase ${tier.name} quantity`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Total + Register */}
              {showRegistrationForm && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {totalTicketCount} ticket{totalTicketCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {totalTicketCost === 0 ? 'Free' : fmtPrice(totalTicketCost)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRegister?.(ticketSelections)}
                    disabled={totalTicketCount === 0}
                    className={clsx(
                      'rounded-md px-6 py-2.5 text-sm font-medium transition-colors',
                      totalTicketCount > 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'cursor-not-allowed bg-gray-300 text-gray-500',
                    )}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* External registration */}
      {eventData.isExternalRegistration && eventData.externalRegistrationUrl && (
        <div className="mt-6">
          <a
            href={eventData.externalRegistrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Register Externally
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Virtual event link */}
      {eventData.virtualEventUrl && status === 'ongoing' && (
        <div className="mt-6">
          <a
            href={eventData.virtualEventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Video className="h-4 w-4" />
            Join Virtual Event
          </a>
        </div>
      )}

      {/* Schedule / Agenda */}
      {showSchedule &&
        eventData.schedule &&
        eventData.schedule.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            <div className="mt-4 space-y-4">
              {eventData.schedule.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-20 flex-shrink-0 text-right text-sm font-medium text-blue-600">
                    {item.time}
                  </div>
                  <div className="relative flex-1 border-l-2 border-blue-200 pl-4 pb-4">
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-blue-400 bg-white" />
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    {item.speaker && (
                      <p className="mt-0.5 text-sm text-gray-500">{item.speaker}</p>
                    )}
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Speakers */}
      {showSpeakers &&
        eventData.speakers &&
        eventData.speakers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Speakers</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eventData.speakers.map((speaker, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                  {speaker.avatar ? (
                    <img
                      src={speaker.avatar}
                      alt={speaker.name}
                      className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <Users className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{speaker.name}</h3>
                    {speaker.title && (
                      <p className="text-sm text-gray-500">{speaker.title}</p>
                    )}
                    {speaker.bio && (
                      <p className="mt-1 text-xs text-gray-600">{speaker.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Tags */}
      {eventData.tags && eventData.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {eventData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const EventCard: React.FC<EventCardProps> = ({
  eventData: eventDataProp = null,
  detailBasePath = '/events',
  mode = 'card',
  cardStyle = 'standard',
  showDate = true,
  showVenue = true,
  showTicketPrice = true,
  showStatus = true,
  showImage = true,
  showFullDescription = true,
  showTickets = true,
  showSchedule = true,
  showSpeakers = true,
  showRegistrationForm = true,
  onRegister,
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

  // --- Detail mode ---
  if (mode === 'detail') {
    return (
      <EventDetailView
        eventData={eventData}
        showImage={showImage}
        showDate={showDate}
        showVenue={showVenue}
        showStatus={showStatus}
        showFullDescription={showFullDescription}
        showTickets={showTickets}
        showSchedule={showSchedule}
        showSpeakers={showSpeakers}
        showRegistrationForm={showRegistrationForm}
        onRegister={onRegister}
        className={className}
      />
    );
  }

  // --- Card mode (existing behavior) ---
  const status = eventData.status ?? 'upcoming';
  const statusStyle = statusColors[status] ?? statusColors.upcoming!;

  if (cardStyle === 'compact') {
    return (
      <a
        href={`${detailBasePath}/${eventData.slug}`}
        className={clsx(
          'group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md',
          className,
        )}
      >
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
