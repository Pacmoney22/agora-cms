'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  url: string;
  linkType?: 'page' | 'url' | 'none';
  pageId?: string;
  openInNewTab?: boolean;
  noFollow?: boolean;
  children?: NavItem[];
}

export interface PageOption {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface FlatItem {
  id: string;
  label: string;
  url: string;
  linkType: 'page' | 'url' | 'none';
  pageId?: string;
  openInNewTab?: boolean;
  noFollow?: boolean;
  depth: number;
  parentId: string | null;
  childIndex: number;
}

interface NavigationTreeEditorProps {
  items: NavItem[];
  onChange: (items: NavItem[]) => void;
  maxDepth?: number;
  pages?: PageOption[];
}

// ── Utilities ──────────────────────────────────────────────────────────

let idCounter = 0;
function genId() {
  return `nav-${Date.now()}-${++idCounter}`;
}

/** Ensure every item has an id (migration from legacy data without ids) */
function ensureIds(items: NavItem[]): NavItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || genId(),
    linkType: item.linkType || (item.url ? 'url' : 'none'),
    children: item.children ? ensureIds(item.children) : undefined,
  }));
}

/** Flatten the tree into a display list with depth info */
function flatten(
  items: NavItem[],
  depth = 0,
  parentId: string | null = null,
): FlatItem[] {
  const result: FlatItem[] = [];
  items.forEach((item, idx) => {
    result.push({
      id: item.id,
      label: item.label,
      url: item.url,
      linkType: item.linkType || 'url',
      pageId: item.pageId,
      openInNewTab: item.openInNewTab,
      noFollow: item.noFollow,
      depth,
      parentId,
      childIndex: idx,
    });
    if (item.children?.length) {
      result.push(...flatten(item.children, depth + 1, item.id));
    }
  });
  return result;
}

/** Deep clone the tree */
function cloneTree(items: NavItem[]): NavItem[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? cloneTree(item.children) : undefined,
  }));
}

/** Find parent array and index for a given item id */
function findItemLocation(
  items: NavItem[],
  id: string,
): { parent: NavItem[]; index: number; parentItem: NavItem | null } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.id === id) {
      return { parent: items, index: i, parentItem: null };
    }
    if (item.children?.length) {
      const found = findItemLocation(item.children!, id);
      if (found) {
        return found.parentItem === null
          ? { ...found, parentItem: item }
          : found;
      }
    }
  }
  return null;
}

/** Remove item from tree, returning the removed item */
function removeItem(items: NavItem[], id: string): NavItem | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.id === id) {
      return items.splice(i, 1)[0] ?? null;
    }
    if (item.children?.length) {
      const found = removeItem(item.children!, id);
      if (found) {
        if (item.children!.length === 0) {
          delete item.children;
        }
        return found;
      }
    }
  }
  return null;
}

/** Strip internal-only fields before saving */
function stripForSave(items: NavItem[]): any[] {
  return items.map(({ id, children, ...rest }) => ({
    ...rest,
    ...(children?.length ? { children: stripForSave(children) } : {}),
  }));
}

// ── Component ──────────────────────────────────────────────────────────

export function NavigationTreeEditor({
  items: externalItems,
  onChange,
  maxDepth = 3,
  pages = [],
}: NavigationTreeEditorProps) {
  const [items, setItems] = useState<NavItem[]>(() => ensureIds(externalItems));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' | 'child' } | null>(null);

  // Track whether a change came from internal editing to avoid resetting editingId
  const internalChangeRef = useRef(false);

  // Sync from external changes (e.g. switching tabs), but NOT from our own propagations
  const prevExternalRef = useRef(externalItems);
  useEffect(() => {
    if (prevExternalRef.current !== externalItems && !internalChangeRef.current) {
      setItems(ensureIds(externalItems));
      setEditingId(null);
    }
    internalChangeRef.current = false;
    prevExternalRef.current = externalItems;
  }, [externalItems]);

  const propagate = useCallback(
    (newItems: NavItem[]) => {
      internalChangeRef.current = true;
      setItems(newItems);
      onChange(stripForSave(newItems) as NavItem[]);
    },
    [onChange],
  );

  const flatList = flatten(items);

  // ── CRUD Operations ────────────────────────────────────────────────

  const addItem = () => {
    const newItem: NavItem = { id: genId(), label: 'New Item', url: '/', linkType: 'url' };
    const newItems = [...items, newItem];
    propagate(newItems);
    setEditingId(newItem.id);
  };

  const deleteItem = (id: string) => {
    const tree = cloneTree(items);
    removeItem(tree, id);
    propagate(tree);
    if (editingId === id) setEditingId(null);
  };

  const updateItemFields = (id: string, updates: Partial<NavItem>) => {
    const tree = cloneTree(items);
    const loc = findItemLocation(tree, id);
    if (!loc) return;
    const existing = loc.parent[loc.index];
    if (!existing) return;
    loc.parent[loc.index] = { ...existing, ...updates };
    propagate(tree);
  };

  // ── Move Operations ────────────────────────────────────────────────

  const moveUp = (id: string) => {
    const tree = cloneTree(items);
    const loc = findItemLocation(tree, id);
    if (!loc || loc.index === 0) return;
    const item = loc.parent.splice(loc.index, 1)[0];
    if (!item) return;
    loc.parent.splice(loc.index - 1, 0, item);
    propagate(tree);
  };

  const moveDown = (id: string) => {
    const tree = cloneTree(items);
    const loc = findItemLocation(tree, id);
    if (!loc || loc.index >= loc.parent.length - 1) return;
    const item = loc.parent.splice(loc.index, 1)[0];
    if (!item) return;
    loc.parent.splice(loc.index + 1, 0, item);
    propagate(tree);
  };

  const indent = (id: string) => {
    const tree = cloneTree(items);
    const loc = findItemLocation(tree, id);
    if (!loc || loc.index === 0) return;
    const prevSibling = loc.parent[loc.index - 1];
    if (!prevSibling) return;
    const flatItem = flatList.find((f) => f.id === id);
    if (flatItem && flatItem.depth >= maxDepth - 1) return;
    const item = loc.parent.splice(loc.index, 1)[0];
    if (!item) return;
    if (!prevSibling.children) prevSibling.children = [];
    prevSibling.children.push(item);
    propagate(tree);
  };

  const outdent = (id: string) => {
    const tree = cloneTree(items);
    const flatItem = flatList.find((f) => f.id === id);
    if (!flatItem || flatItem.depth === 0) return;
    const removed = removeItem(tree, id);
    if (!removed) return;
    const parentLoc = findItemLocation(tree, flatItem.parentId!);
    if (parentLoc) {
      parentLoc.parent.splice(parentLoc.index + 1, 0, removed);
    }
    propagate(tree);
  };

  // ── Drag and Drop ──────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'child';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'child';
    }

    if (position === 'child') {
      const targetFlat = flatList.find((f) => f.id === targetId);
      if (targetFlat && targetFlat.depth >= maxDepth - 1) {
        position = 'after';
      }
    }

    setDropTarget({ id: targetId, position });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || !dropTarget || dragId === dropTarget.id) {
      setDragId(null);
      setDropTarget(null);
      return;
    }

    const isDescendant = (parentId: string, childId: string, tree: NavItem[]): boolean => {
      for (const item of tree) {
        if (item.id === parentId) {
          const checkChildren = (children: NavItem[]): boolean => {
            for (const child of children) {
              if (child.id === childId) return true;
              if (child.children && checkChildren(child.children)) return true;
            }
            return false;
          };
          return item.children ? checkChildren(item.children) : false;
        }
        if (item.children && isDescendant(parentId, childId, item.children)) return true;
      }
      return false;
    };

    if (isDescendant(dragId, dropTarget.id, items)) {
      setDragId(null);
      setDropTarget(null);
      return;
    }

    const tree = cloneTree(items);
    const draggedItem = removeItem(tree, dragId);
    if (!draggedItem) {
      setDragId(null);
      setDropTarget(null);
      return;
    }

    const targetLoc = findItemLocation(tree, dropTarget.id);
    if (!targetLoc) {
      setDragId(null);
      setDropTarget(null);
      return;
    }

    switch (dropTarget.position) {
      case 'before':
        targetLoc.parent.splice(targetLoc.index, 0, draggedItem);
        break;
      case 'after':
        targetLoc.parent.splice(targetLoc.index + 1, 0, draggedItem);
        break;
      case 'child': {
        const targetItem = targetLoc.parent[targetLoc.index];
        if (!targetItem) break;
        if (!targetItem.children) targetItem.children = [];
        targetItem.children.push(draggedItem);
        break;
      }
    }

    propagate(tree);
    setDragId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {flatList.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 px-6 py-10 text-center">
          <p className="text-sm text-gray-400">No menu items yet</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;Add Item&quot; to create your first menu link</p>
        </div>
      )}

      {flatList.map((flat) => {
        const isEditing = editingId === flat.id;
        const isDragging = dragId === flat.id;
        const isDropBefore = dropTarget?.id === flat.id && dropTarget.position === 'before';
        const isDropAfter = dropTarget?.id === flat.id && dropTarget.position === 'after';
        const isDropChild = dropTarget?.id === flat.id && dropTarget.position === 'child';

        return (
          <div
            key={flat.id}
            style={{ marginLeft: flat.depth * 24 }}
            className="relative"
          >
            {isDropBefore && (
              <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded" />
            )}

            <div
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, flat.id)}
              onDragOver={(e) => handleDragOver(e, flat.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={clsx(
                'group rounded-lg border transition-all',
                isDragging && 'opacity-40',
                isDropChild && 'border-blue-400 bg-blue-50',
                isEditing && 'border-blue-300 bg-blue-50/30 shadow-sm',
                !isDragging && !isDropChild && !isEditing && 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
              )}
            >
              {/* Collapsed row */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Drag handle */}
                {!isEditing && (
                  <div className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing" title="Drag to reorder">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="3" r="1.5" />
                      <circle cx="11" cy="3" r="1.5" />
                      <circle cx="5" cy="8" r="1.5" />
                      <circle cx="11" cy="8" r="1.5" />
                      <circle cx="5" cy="13" r="1.5" />
                      <circle cx="11" cy="13" r="1.5" />
                    </svg>
                  </div>
                )}

                {flat.depth > 0 && (
                  <span className="text-[10px] text-gray-300">&lsaquo;</span>
                )}

                {/* Label and URL summary (click to edit) */}
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 text-left min-w-0"
                  onClick={() => setEditingId(isEditing ? null : flat.id)}
                  title="Click to edit"
                >
                  <span className="text-sm font-medium text-gray-800 truncate">{flat.label || '(untitled)'}</span>
                  {flat.linkType === 'page' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-500 truncate">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                      {flat.url || 'No page selected'}
                    </span>
                  ) : flat.linkType === 'none' ? (
                    <span className="text-xs text-gray-300 italic">No link</span>
                  ) : (
                    <span className="text-xs text-gray-400 truncate">{flat.url}</span>
                  )}
                  {flat.openInNewTab && (
                    <span className="text-[10px] text-gray-300" title="Opens in new tab">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </span>
                  )}
                </button>

                {/* Action buttons */}
                <div className={clsx('flex items-center gap-0.5 shrink-0', !isEditing && 'opacity-0 group-hover:opacity-100 transition-opacity')}>
                  <button type="button" onClick={() => moveUp(flat.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Move up">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button type="button" onClick={() => moveDown(flat.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Move down">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <button type="button" onClick={() => indent(flat.id)} disabled={flat.depth >= maxDepth - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30" title="Indent (make sub-item)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                  <button type="button" onClick={() => outdent(flat.id)} disabled={flat.depth === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30" title="Outdent (move to parent level)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <button type="button" onClick={() => deleteItem(flat.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                  </button>
                </div>
              </div>

              {/* Expanded edit panel */}
              {isEditing && (
                <EditingPanel
                  item={flat}
                  pages={pages}
                  onSave={(updates) => {
                    updateItemFields(flat.id, updates);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>

            {isDropAfter && (
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded" />
            )}
          </div>
        );
      })}

      {/* Add Item button */}
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Menu Item
      </button>
    </div>
  );
}

// ── Editing Panel ─────────────────────────────────────────────────────

interface EditingPanelProps {
  item: FlatItem;
  pages: PageOption[];
  onSave: (updates: Partial<NavItem>) => void;
  onCancel: () => void;
}

function EditingPanel({ item, pages, onSave, onCancel }: EditingPanelProps) {
  const [label, setLabel] = useState(item.label);
  const [linkType, setLinkType] = useState<'page' | 'url' | 'none'>(item.linkType);
  const [url, setUrl] = useState(item.url);
  const [pageId, setPageId] = useState(item.pageId || '');
  const [openInNewTab, setOpenInNewTab] = useState(item.openInNewTab || false);
  const [noFollow, setNoFollow] = useState(item.noFollow || false);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
    labelRef.current?.select();
  }, []);

  const handlePageChange = (selectedPageId: string) => {
    setPageId(selectedPageId);
    const page = pages.find((p) => p.id === selectedPageId);
    if (page) {
      setUrl(page.slug.startsWith('/') ? page.slug : `/${page.slug}`);
    }
  };

  const handleSave = () => {
    const updates: Partial<NavItem> = {
      label,
      linkType,
      openInNewTab,
      noFollow,
    };
    if (linkType === 'page') {
      updates.pageId = pageId;
      updates.url = url;
    } else if (linkType === 'url') {
      updates.url = url;
      updates.pageId = undefined;
    } else {
      updates.url = '';
      updates.pageId = undefined;
    }
    onSave(updates);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="border-t border-blue-100 px-3 pb-3 pt-2 space-y-3">
      {/* Label */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-1">Label</label>
        <input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Menu item label"
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Link Type */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 mb-1">Link Type</label>
        <div className="flex gap-1">
          {([
            { value: 'page', label: 'Page', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
            { value: 'url', label: 'Custom URL', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
            { value: 'none', label: 'No Link', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLinkType(opt.value)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                linkType === opt.value
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Picker */}
      {linkType === 'page' && (
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-1">Select Page</label>
          {pages.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No pages available. Create pages first.</p>
          ) : (
            <select
              value={pageId}
              onChange={(e) => handlePageChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">-- Select a page --</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug}){page.status === 'draft' ? ' [Draft]' : ''}
                </option>
              ))}
            </select>
          )}
          {pageId && (
            <p className="mt-1 text-[10px] text-gray-400">URL: {url}</p>
          )}
        </div>
      )}

      {/* Custom URL */}
      {linkType === 'url' && (
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-1">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="/ for internal, https://... for external"
            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 font-mono focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Use <span className="font-mono">/path</span> for internal links or <span className="font-mono">https://</span> for external links
          </p>
        </div>
      )}

      {/* Link Behavior */}
      {linkType !== 'none' && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            Open in new tab
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={noFollow}
              onChange={(e) => setNoFollow(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            nofollow
            <span className="text-[10px] text-gray-400">(external links)</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
