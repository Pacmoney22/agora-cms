import React from 'react';
import { clsx } from 'clsx';
import { MapPin, Navigation } from 'lucide-react';

export interface MapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  height?: number;
  showMarker?: boolean;
  markerLabel?: string | null;
  mapStyle?: 'standard' | 'silver' | 'dark' | 'retro';
  address?: string | null;
  showDirectionsLink?: boolean;
  className?: string;
}

export const Map: React.FC<MapProps> = ({
  latitude = 40.7128,
  longitude = -74.006,
  zoom = 14,
  height = 400,
  showMarker = true,
  markerLabel = null,
  mapStyle = 'standard',
  address = null,
  showDirectionsLink = true,
  className,
}) => {
  const delta = 0.01 * Math.pow(2, 14 - zoom);
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;

  const markerParam = showMarker ? `&marker=${latitude},${longitude}` : '';

  const layerMap: Record<string, string> = {
    standard: 'mapnik',
    silver: 'mapnik',
    dark: 'mapnik',
    retro: 'mapnik',
  };

  const layer = layerMap[mapStyle] || 'mapnik';
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${layer}${markerParam}`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className={clsx('w-full', className)}>
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-lg border border-gray-200',
          mapStyle === 'dark' && 'brightness-75 contrast-125 invert saturate-0',
          mapStyle === 'silver' && 'saturate-50',
          mapStyle === 'retro' && 'sepia',
        )}
        style={{ height: `${height}px` }}
      >
        <iframe
          src={iframeSrc}
          title="Map"
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {(address || showDirectionsLink) && (
        <div className="mt-3 flex items-start justify-between gap-4">
          {address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <div>
                {markerLabel && (
                  <p className="font-medium text-gray-900">{markerLabel}</p>
                )}
                <p>{address}</p>
              </div>
            </div>
          )}

          {showDirectionsLink && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Navigation className="h-3.5 w-3.5" />
              Get Directions
            </a>
          )}
        </div>
      )}
    </div>
  );
};
