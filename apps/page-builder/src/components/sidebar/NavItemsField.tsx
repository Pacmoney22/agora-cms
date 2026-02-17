'use client';

import React, { useState, useCallback } from 'react';
import { useBuilderStore } from '@/stores/builder-store';
import { useNavigation } from '@/hooks/useNavigation';
import { findNode } from '@/lib/tree-operations';
import type { NavItem } from '@/hooks/useNavigation';

interface NavItemsFieldProps {
  value: NavItem[];
  onChange: (items: NavItem[]) => void;
}

export const NavItemsField: React.FC<NavItemsFieldProps> = ({ value, onChange }) => {
  const items = Array.isArray(value) ? value : [];
  const { selectedInstanceId, componentTree } = useBuilderStore();
  const { loading, error, fetchNavigation } = useNavigation();
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const selectedInstance = selectedInstanceId
    ? findNode(componentTree.root, selectedInstanceId)
    : null;
  const navigationMenu = selectedInstance?.props?.navigationMenu as string | undefined;

  const handleLoad = useCallback(async () => {
    if (!navigationMenu || navigationMenu === 'none') return;
    const fetched = await fetchNavigation(navigationMenu);
    if (fetched.length > 0) {
      onChange(fetched);
    }
  }, [navigationMenu, fetchNavigation, onChange]);

  const addItem = () => {
    onChange([...items, { label: '', url: '#', children: [] }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof NavItem, val: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: val } : item,
    );
    onChange(updated);
  };

  const addChild = (parentIndex: number) => {
    const updated = items.map((item, i) =>
      i === parentIndex
        ? { ...item, children: [...(item.children || []), { label: '', url: '#' }] }
        : item,
    );
    onChange(updated);
  };

  const removeChild = (parentIndex: number, childIndex: number) => {
    const updated = items.map((item, i) =>
      i === parentIndex
        ? { ...item, children: (item.children || []).filter((_, j) => j !== childIndex) }
        : item,
    );
    onChange(updated);
  };

  const updateChild = (parentIndex: number, childIndex: number, field: string, val: string) => {
    const updated = items.map((item, i) =>
      i === parentIndex
        ? {
            ...item,
            children: (item.children || []).map((child, j) =>
              j === childIndex ? { ...child, [field]: val } : child,
            ),
          }
        : item,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Load from API button */}
      {navigationMenu && navigationMenu !== 'none' && (
        <button
          type="button"
          onClick={handleLoad}
          disabled={loading}
          className="w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load from "${navigationMenu}" menu`}
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Items list */}
      {items.map((item, i) => (
        <div key={i} className="rounded border border-gray-200 bg-gray-50 p-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditIndex(editIndex === i ? null : i)}
              className="flex-1 text-left text-xs font-medium text-gray-700 truncate"
            >
              {item.label || '(untitled)'} → {item.url}
            </button>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>

          {editIndex === i && (
            <div className="mt-2 space-y-1.5">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(i, 'label', e.target.value)}
                placeholder="Label"
                className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
              />
              <input
                type="text"
                value={item.url}
                onChange={(e) => updateItem(i, 'url', e.target.value)}
                placeholder="URL"
                className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
              />

              {/* Children */}
              <div className="ml-3 space-y-1 border-l border-gray-300 pl-2">
                <span className="text-[10px] font-medium text-gray-400 uppercase">Sub-items</span>
                {(item.children || []).map((child, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={child.label}
                      onChange={(e) => updateChild(i, j, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={child.url}
                      onChange={(e) => updateChild(i, j, 'url', e.target.value)}
                      placeholder="URL"
                      className="flex-1 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeChild(i, j)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addChild(i)}
                  className="text-[10px] text-blue-600 hover:text-blue-800"
                >
                  + Add sub-item
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full rounded-md border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
      >
        + Add nav item
      </button>
    </div>
  );
};
