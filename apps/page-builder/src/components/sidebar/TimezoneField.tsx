'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Common IANA timezones grouped by region.
 * Covers the most-used zones without overwhelming users.
 */
const TIMEZONE_GROUPS: { region: string; zones: string[] }[] = [
  {
    region: 'Americas',
    zones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Phoenix',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'America/Bogota',
      'America/Lima',
      'America/Santiago',
      'America/Sao_Paulo',
      'America/Argentina/Buenos_Aires',
    ],
  },
  {
    region: 'Europe',
    zones: [
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Zurich',
      'Europe/Vienna',
      'Europe/Stockholm',
      'Europe/Oslo',
      'Europe/Helsinki',
      'Europe/Warsaw',
      'Europe/Prague',
      'Europe/Athens',
      'Europe/Bucharest',
      'Europe/Moscow',
      'Europe/Istanbul',
    ],
  },
  {
    region: 'Asia & Middle East',
    zones: [
      'Asia/Dubai',
      'Asia/Riyadh',
      'Asia/Karachi',
      'Asia/Kolkata',
      'Asia/Dhaka',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Seoul',
      'Asia/Tokyo',
      'Asia/Taipei',
      'Asia/Jakarta',
      'Asia/Manila',
    ],
  },
  {
    region: 'Oceania',
    zones: [
      'Pacific/Auckland',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Perth',
      'Pacific/Honolulu',
      'Pacific/Fiji',
    ],
  },
  {
    region: 'Africa',
    zones: [
      'Africa/Cairo',
      'Africa/Lagos',
      'Africa/Nairobi',
      'Africa/Johannesburg',
      'Africa/Casablanca',
    ],
  },
  {
    region: 'Other',
    zones: ['UTC'],
  },
];

/** Format a timezone for display: "America/New_York" → "New York (America)" with UTC offset */
function formatTz(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    const offset = offsetPart?.value ?? '';
    const label = tz.replace(/_/g, ' ').replace(/\//g, ' / ');
    return `${label} (${offset})`;
  } catch {
    return tz;
  }
}

interface TimezoneFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const TimezoneField: React.FC<TimezoneFieldProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return TIMEZONE_GROUPS;
    const q = search.toLowerCase();
    return TIMEZONE_GROUPS.map((g) => ({
      ...g,
      zones: g.zones.filter(
        (tz) =>
          tz.toLowerCase().includes(q) ||
          formatTz(tz).toLowerCase().includes(q),
      ),
    })).filter((g) => g.zones.length > 0);
  }, [search]);

  const displayValue = value ? formatTz(value) : 'Select timezone...';

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-sm text-gray-700 hover:border-gray-300 focus:border-blue-400 focus:outline-none"
      >
        <span className="truncate">{displayValue}</span>
        <span className="ml-1 text-[10px] text-gray-400">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-100 p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezones..."
              autoFocus
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Timezone list */}
          <div className="max-h-52 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No timezones match &quot;{search}&quot;
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.region}>
                  <div className="sticky top-0 bg-gray-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.region}
                  </div>
                  {group.zones.map((tz) => (
                    <button
                      key={tz}
                      type="button"
                      onClick={() => {
                        onChange(tz);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors ${
                        tz === value
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {formatTz(tz)}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
