'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

interface FormEntry {
  key: string;
  id: string;
  name: string;
  fieldCount: number;
}

interface FormSelectorFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const FormSelectorField: React.FC<FormSelectorFieldProps> = ({ value, onChange }) => {
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const allSettings = await apiFetch<Record<string, unknown>>('/api/v1/settings');
      const formEntries: FormEntry[] = [];
      for (const [key, val] of Object.entries(allSettings)) {
        if (key.startsWith('form_') && val && typeof val === 'object') {
          const formData = val as Record<string, unknown>;
          const id = key.replace('form_', '');
          formEntries.push({
            key,
            id,
            name: (formData.name as string) || (formData.title as string) || id,
            fieldCount: Array.isArray(formData.fields) ? formData.fields.length : 0,
          });
        }
      }
      setForms(formEntries);
    } catch {
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchForms();
    }
  }, [isOpen]);

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

  const selectedForm = forms.find((f) => f.id === value);

  return (
    <div ref={dropdownRef} className="relative space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className={selectedForm || value ? 'text-gray-700' : 'text-gray-400'}>
          {selectedForm ? selectedForm.name : value ? `Form: ${value}` : 'Select a form...'}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedForm && (
        <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs">
          <span className="truncate font-medium text-blue-700">{selectedForm.name}</span>
          <span className="ml-2 text-blue-500">{selectedForm.fieldCount} fields</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-1 text-blue-400 hover:text-blue-600"
            title="Clear"
          >
            &times;
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">Loading forms...</div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
                <button type="button" onClick={() => fetchForms()} className="ml-2 text-blue-500 hover:underline">
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && forms.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No forms found. Create forms in Admin &gt; Forms.
              </div>
            )}

            {!loading && !error && forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => { onChange(form.id); setIsOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  value === form.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{form.name}</div>
                  <div className="truncate text-[10px] text-gray-400">{form.fieldCount} fields</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
