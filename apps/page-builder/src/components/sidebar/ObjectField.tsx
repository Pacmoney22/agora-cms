'use client';

import React, { useState } from 'react';
import type { PropertySchema } from '@/lib/component-registry';
import { PropertyField } from './PropertyField';

interface ObjectFieldProps {
  schema: PropertySchema;
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown>) => void;
  depth?: number;
}

export const ObjectField: React.FC<ObjectFieldProps> = ({
  schema,
  value,
  onChange,
  depth = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  const currentValue = (value ?? (typeof schema.default === 'object' && schema.default !== null ? schema.default : {})) as Record<string, unknown>;

  const handleSubChange = (key: string, subValue: unknown) => {
    onChange({ ...currentValue, [key]: subValue });
  };

  if (!schema.properties) return null;

  return (
    <div className="rounded-md border border-gray-200">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <span>{schema.label}</span>
        <span className="text-[10px] text-gray-400">{isExpanded ? '\u25BC' : '\u25B6'}</span>
      </button>
      {isExpanded && (
        <div className="space-y-3 border-t border-gray-200 px-2 py-2">
          {Object.entries(schema.properties).map(([key, propSchema]) => (
            <PropertyField
              key={key}
              name={key}
              schema={propSchema}
              value={currentValue[key]}
              onChange={(val) => handleSubChange(key, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
