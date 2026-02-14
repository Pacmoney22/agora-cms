'use client';

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import {
  getComponentsByCategory,
  type RegisteredComponent,
} from '@/lib/component-registry';

export const ComponentPalette: React.FC = () => {
  const [search, setSearch] = useState('');
  const categories = getComponentsByCategory();

  const filteredCategories = Object.entries(categories).reduce(
    (acc, [category, components]) => {
      const filtered = components.filter((c) =>
        c.schema.name.toLowerCase().includes(search.toLowerCase()),
      );
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    },
    {} as Record<string, RegisteredComponent[]>,
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Search components..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      {Object.entries(filteredCategories).map(([category, components]) => (
        <div key={category}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {category}
          </h3>
          <div className="space-y-1">
            {components.map((entry) => (
              <PaletteItem key={entry.schema.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {Object.keys(filteredCategories).length === 0 && (
        <p className="py-4 text-center text-xs text-gray-400">No matching components</p>
      )}
    </div>
  );
};

const PaletteItem: React.FC<{ entry: RegisteredComponent }> = ({ entry }) => {
  const { schema } = entry;

  // Build default props from schema
  const defaultProps: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.default !== null && prop.default !== undefined) {
      defaultProps[key] = prop.default;
    }
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${schema.id}`,
    data: {
      fromPalette: true,
      componentId: schema.id,
      label: schema.name,
      defaultProps,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={clsx(
        'flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600',
        'cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50 transition-colors',
        isDragging && 'opacity-50',
      )}
    >
      <span className="text-gray-400 text-xs w-4 text-center">
        {getIconSymbol(schema.icon)}
      </span>
      <span>{schema.name}</span>
      {schema.acceptsChildren && (
        <span className="ml-auto text-[10px] text-gray-300" title="Accepts children">
          &#x25A1;
        </span>
      )}
    </div>
  );
};

function getIconSymbol(icon: string): string {
  const iconMap: Record<string, string> = {
    container: '\u25A1',
    section: '\u2500',
    grid: '\u2591',
    divider: '\u2500',
    spacer: '\u2195',
    heading: 'H',
    paragraph: '\u00B6',
    image: '\u25A3',
    'hero-banner': '\u2605',
    'cta-block': '\u261E',
  };
  return iconMap[icon] || '\u25CB';
}
