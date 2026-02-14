'use client';

import React, { useState } from 'react';
import type { PropertySchema } from '@/lib/component-registry';
import { PropertyField, renderInput } from './PropertyField';

interface ArrayFieldProps {
  schema: PropertySchema;
  value: unknown[] | null;
  onChange: (value: unknown[]) => void;
}

function getItemSchema(schema: PropertySchema): PropertySchema | undefined {
  return schema.items;
}

function getTypeDefault(type: string): unknown {
  switch (type) {
    case 'number': return 0;
    case 'boolean': return false;
    case 'array': return [];
    case 'object': return {};
    default: return '';
  }
}

function createDefaultItem(itemSchema: PropertySchema | undefined): unknown {
  if (!itemSchema) return '';

  switch (itemSchema.type) {
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (itemSchema.properties) {
        for (const [key, propSchema] of Object.entries(itemSchema.properties)) {
          obj[key] = propSchema.default ?? getTypeDefault(propSchema.type);
        }
      }
      return obj;
    }
    case 'number': return itemSchema.default ?? 0;
    case 'boolean': return itemSchema.default ?? false;
    case 'array': return itemSchema.default ?? [];
    default: return itemSchema.default ?? '';
  }
}

function getItemSummary(
  item: unknown,
  itemSchema: PropertySchema | undefined,
  index: number,
): string {
  if (!item || typeof item !== 'object') return `Item ${index + 1}`;
  const obj = item as Record<string, unknown>;

  for (const key of ['label', 'title', 'name', 'heading', 'text', 'quote', 'header', 'feature']) {
    if (obj[key] && typeof obj[key] === 'string') {
      const text = obj[key] as string;
      return text.length > 30 ? text.slice(0, 30) + '...' : text;
    }
  }

  return `Item ${index + 1}`;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({ schema, value, onChange }) => {
  const itemSchema = getItemSchema(schema);
  const currentValue = (value ?? (Array.isArray(schema.default) ? schema.default : [])) as unknown[];
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addItem = () => {
    const newItem = createDefaultItem(itemSchema);
    onChange([...currentValue, newItem]);
    if (itemSchema?.type === 'object') {
      setExpandedItems((prev) => new Set(prev).add(currentValue.length));
    }
  };

  const removeItem = (index: number) => {
    const next = [...currentValue];
    next.splice(index, 1);
    onChange(next);
    setExpandedItems((prev) => {
      const adjusted = new Set<number>();
      for (const i of prev) {
        if (i < index) adjusted.add(i);
        else if (i > index) adjusted.add(i - 1);
      }
      return adjusted;
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentValue.length) return;
    const next = [...currentValue];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
    setExpandedItems((prev) => {
      const adjusted = new Set<number>();
      for (const i of prev) {
        if (i === index) adjusted.add(targetIndex);
        else if (i === targetIndex) adjusted.add(index);
        else adjusted.add(i);
      }
      return adjusted;
    });
  };

  const updateItem = (index: number, newValue: unknown) => {
    const next = [...currentValue];
    next[index] = newValue;
    onChange(next);
  };

  const isObjectArray = itemSchema?.type === 'object';

  // Derive a singular label for the "Add" button
  const singularLabel = schema.label
    ? schema.label.replace(/ies$/, 'y').replace(/s$/, '')
    : 'Item';

  return (
    <div className="space-y-2">
      {currentValue.map((item, index) => (
        <div key={index} className="rounded-md border border-gray-200">
          {/* Item header */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50">
            {/* Reorder buttons */}
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveItem(index, -1)}
              className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move up"
            >
              &#x25B2;
            </button>
            <button
              type="button"
              disabled={index === currentValue.length - 1}
              onClick={() => moveItem(index, 1)}
              className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move down"
            >
              &#x25BC;
            </button>

            {/* Item label / summary */}
            {isObjectArray ? (
              <button
                type="button"
                onClick={() => toggleItem(index)}
                className="flex-1 text-left text-xs text-gray-600 truncate"
              >
                <span className="text-[10px] text-gray-400 mr-1">
                  {expandedItems.has(index) ? '\u25BC' : '\u25B6'}
                </span>
                {getItemSummary(item, itemSchema, index)}
              </button>
            ) : (
              <span className="flex-1 text-xs text-gray-500">#{index + 1}</span>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-xs text-red-400 hover:text-red-600 px-1"
              title="Remove"
            >
              &times;
            </button>
          </div>

          {/* Item body */}
          {isObjectArray ? (
            expandedItems.has(index) && (
              <div className="space-y-3 border-t border-gray-200 px-2 py-2">
                {Object.entries(itemSchema!.properties!).map(([key, propSchema]) => (
                  <PropertyField
                    key={key}
                    name={key}
                    schema={propSchema}
                    value={(item as Record<string, unknown>)?.[key]}
                    onChange={(val) => {
                      updateItem(index, {
                        ...(item as Record<string, unknown>),
                        [key]: val,
                      });
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="px-2 py-1.5">
              {renderInput(
                itemSchema ?? { type: 'string', label: '' },
                item,
                (val) => updateItem(index, val),
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        + Add {singularLabel}
      </button>
    </div>
  );
};
