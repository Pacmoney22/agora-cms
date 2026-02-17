import React from 'react';
import { clsx } from 'clsx';
import { Calendar, List, LayoutGrid } from 'lucide-react';
import { EventCard, type EventData } from './EventCard';

export interface EventGridProps {
  source?: 'all' | 'upcoming' | 'past' | 'featured';
  events?: EventData[];
  maxEvents?: number;
  columns?: number;
  layout?: 'grid' | 'list' | 'calendar';
  showFilters?: boolean;
  cardStyle?: 'standard' | 'compact' | 'featured';
  showDate?: boolean;
  showVenue?: boolean;
  showTicketPrice?: boolean;
  emptyMessage?: string;
  viewAllLink?: string | null;
  detailBasePath?: string;
  className?: string;
}

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// Sample events for builder preview
const sampleEvents: EventData[] = [
  {
    title: 'Annual Tech Conference 2025',
    startDate: '2025-09-15T09:00:00Z',
    endDate: '2025-09-17T17:00:00Z',
    venue: 'Convention Center',
    location: 'San Francisco, CA',
    description: 'Join us for three days of innovation and networking.',
    ticketPriceMin: 199,
    ticketPriceMax: 599,
    status: 'upcoming',
    slug: 'annual-tech-conference-2025',
  },
  {
    title: 'Design Workshop',
    startDate: '2025-08-20T10:00:00Z',
    venue: 'Creative Hub',
    location: 'New York, NY',
    ticketPriceMin: 49,
    ticketPriceMax: 49,
    status: 'upcoming',
    slug: 'design-workshop',
  },
  {
    title: 'Networking Mixer',
    startDate: '2025-07-10T18:00:00Z',
    venue: 'Rooftop Lounge',
    location: 'Austin, TX',
    ticketPriceMin: 0,
    ticketPriceMax: 0,
    status: 'upcoming',
    slug: 'networking-mixer',
  },
];

export const EventGrid: React.FC<EventGridProps> = ({
  source = 'upcoming',
  events,
  maxEvents = 6,
  columns = 3,
  layout = 'grid',
  showFilters = false,
  cardStyle = 'standard',
  showDate = true,
  showVenue = true,
  showTicketPrice = true,
  emptyMessage = 'No events found',
  viewAllLink = null,
  detailBasePath = '/events',
  className,
}) => {
  // Use provided events or sample data for builder preview
  const displayEvents = (events ?? sampleEvents).slice(0, maxEvents);

  if (displayEvents.length === 0) {
    return (
      <div className={clsx('py-12 text-center', className)}>
        <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const colClass = columnClasses[columns] ?? columnClasses[3];

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header with optional filters */}
      {(showFilters || viewAllLink) && (
        <div className="flex items-center justify-between">
          {showFilters && (
            <div className="flex items-center gap-2">
              <button
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  layout === 'grid'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  layout === 'list'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
          {viewAllLink && (
            <a
              href={viewAllLink}
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              View All Events &rarr;
            </a>
          )}
        </div>
      )}

      {/* Event grid/list */}
      {layout === 'list' ? (
        <div className="space-y-3">
          {displayEvents.map((event, index) => (
            <EventCard
              key={event.slug || index}
              eventData={event}
              cardStyle="compact"
              showDate={showDate}
              showVenue={showVenue}
              showTicketPrice={showTicketPrice}
              detailBasePath={detailBasePath}
            />
          ))}
        </div>
      ) : (
        <div className={clsx('grid gap-6', colClass)}>
          {displayEvents.map((event, index) => (
            <EventCard
              key={event.slug || index}
              eventData={event}
              cardStyle={cardStyle}
              showDate={showDate}
              showVenue={showVenue}
              showTicketPrice={showTicketPrice}
              detailBasePath={detailBasePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
