'use client';

import React from 'react';
import type { PropertySchema } from '@/lib/component-registry';
import { BooleanField } from './BooleanField';
import { ObjectField } from './ObjectField';
import { ArrayField } from './ArrayField';
import { TipTapEditor } from './TipTapEditor';
import { MediaField } from './MediaField';
import { IconField } from './IconField';
import { TimezoneField } from './TimezoneField';
import { PageLinkField } from './PageLinkField';
import { ProductField } from './ProductField';
import { CategoryField } from './CategoryField';
import { NavItemsField } from './NavItemsField';
import { BlogPostsField } from './BlogPostsField';
import { AddressLookupField } from './AddressLookupField';
import { MultiProductField } from './MultiProductField';
import { MultiCategoryField } from './MultiCategoryField';
import { ReviewSourceField } from './ReviewSourceField';
import { ArticleField } from './ArticleField';

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

/** Convert an ISO 8601 string to the `YYYY-MM-DDThh:mm` format expected by datetime-local inputs. */
function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // Format as local datetime: YYYY-MM-DDThh:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
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

    case 'image':
      return (
        <MediaField
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          placeholder="Image URL..."
          mimeTypeFilter="image"
        />
      );

    case 'url':
      return (
        <MediaField
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          placeholder="https://..."
        />
      );

    case 'icon':
      return (
        <IconField
          value={String(value ?? '')}
          onChange={(v) => onChange(v || null)}
        />
      );

    case 'richtext':
      return (
        <TipTapEditor
          value={String(value ?? '')}
          onChange={(html) => onChange(html)}
          placeholder={schema.label}
        />
      );

    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={toDatetimeLocal(String(value ?? ''))}
          onChange={(e) => {
            const local = e.target.value;
            onChange(local ? new Date(local).toISOString() : '');
          }}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        />
      );

    case 'timezone':
      return (
        <TimezoneField
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
        />
      );

    case 'pagelink':
      return (
        <PageLinkField
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
        />
      );

    case 'product':
      return (
        <ProductField
          value={String(value ?? '')}
          onChange={(v) => onChange(v || null)}
        />
      );

    case 'article':
      return (
        <ArticleField
          value={String(value ?? '')}
          onChange={(v) => onChange(v || null)}
        />
      );

    case 'category':
      return (
        <CategoryField
          value={String(value ?? '')}
          onChange={(v) => onChange(v || null)}
        />
      );

    case 'navitems':
      return (
        <NavItemsField
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v)}
        />
      );

    case 'blogposts':
      return (
        <BlogPostsField
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v)}
        />
      );

    case 'addresslookup':
      return (
        <AddressLookupField
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
        />
      );

    case 'products':
      return (
        <MultiProductField
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v)}
        />
      );

    case 'categories':
      return (
        <MultiCategoryField
          value={Array.isArray(value) ? value : []}
          onChange={(v) => onChange(v)}
        />
      );

    case 'reviewsource':
      return (
        <ReviewSourceField
          value={value && typeof value === 'object' ? value as { productId: string; productName?: string } : null}
          onChange={(v) => onChange(v)}
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
