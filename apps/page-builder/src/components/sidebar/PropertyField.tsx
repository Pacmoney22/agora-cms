'use client';

import React from 'react';
import type { PropertySchema } from '@/lib/component-registry';
import { BooleanField } from './BooleanField';
import { ObjectField } from './ObjectField';
import { ArrayField } from './ArrayField';

export interface PropertyFieldProps {
  name: string;
  schema: PropertySchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

function getTypeDefault(type: string): unknown {
  switch (type) {
    case 'boolean': return false;
    case 'number': return 0;
    case 'array': return [];
    case 'object': return {};
    default: return '';
  }
}

export const PropertyField: React.FC<PropertyFieldProps> = ({ name, schema, value, onChange }) => {
  const currentValue = value ?? schema.default ?? getTypeDefault(schema.type);

  // Object fields render their own collapsible header with the label
  if (schema.type === 'object') {
    return renderInput(schema, currentValue, onChange);
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">{schema.label}</label>
      {renderInput(schema, currentValue, onChange)}
    </div>
  );
};

export function renderInput(
  schema: PropertySchema,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  switch (schema.type) {
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <BooleanField value={Boolean(value)} onChange={onChange} />
          <span className="text-xs text-gray-400">{value ? 'On' : 'Off'}</span>
        </div>
      );

    case 'object':
      return (
        <ObjectField
          schema={schema}
          value={value as Record<string, unknown> | null}
          onChange={onChange as (v: Record<string, unknown>) => void}
        />
      );

    case 'array':
      return (
        <ArrayField
          schema={schema}
          value={value as unknown[] | null}
          onChange={onChange as (v: unknown[]) => void}
        />
      );

    case 'enum':
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        >
          {schema.values?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value || '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-gray-200"
          />
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="none"
            className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
          />
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value !== null && value !== undefined ? Number(value) : ''}
          min={schema.min}
          max={schema.max}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
      );

    case 'url':
    case 'image':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={schema.type === 'image' ? 'Image URL...' : 'https://...'}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
      );

    case 'string':
    default:
      if (schema.multiline) {
        return (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none resize-y"
          />
        );
      }
      return (
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
      );
  }
}
