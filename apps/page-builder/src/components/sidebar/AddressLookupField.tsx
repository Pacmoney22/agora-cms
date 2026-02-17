'use client';

import React, { useState, useCallback } from 'react';
import { useBuilderStore } from '@/stores/builder-store';

interface AddressLookupFieldProps {
  value: string;
  onChange: (value: string) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const AddressLookupField: React.FC<AddressLookupFieldProps> = ({ value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const { selectedInstanceId, updateComponentProps } = useBuilderStore();

  const handleSearch = useCallback(async () => {
    if (!value || value.trim().length < 3) {
      setError('Enter at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        q: value,
        format: 'json',
        limit: '5',
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'Accept': 'application/json' } },
      );
      if (!res.ok) throw new Error('Geocoding request failed');

      const data: NominatimResult[] = await res.json();
      if (data.length === 0) {
        setError('No results found');
      } else {
        setResults(data);
      }
    } catch {
      setError('Failed to look up address');
    } finally {
      setLoading(false);
    }
  }, [value]);

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      if (!selectedInstanceId) return;
      updateComponentProps(selectedInstanceId, {
        latitude: Number.parseFloat(result.lat),
        longitude: Number.parseFloat(result.lon),
        address: result.display_name,
      });
      onChange(result.display_name);
      setResults([]);
    },
    [selectedInstanceId, updateComponentProps, onChange],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search address..."
          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {loading ? '...' : 'Lookup'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="max-h-36 overflow-y-auto rounded border border-gray-200 bg-white">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(r)}
              className="block w-full border-b border-gray-100 px-2 py-1.5 text-left text-xs text-gray-700 last:border-b-0 hover:bg-blue-50"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
