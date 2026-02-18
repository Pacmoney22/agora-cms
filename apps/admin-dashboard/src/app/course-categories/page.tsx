'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

// ── Types ──

interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  image: string;
  position: number;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

interface CategoryRegistry {
  categories: CourseCategory[];
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  image: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoOgImage: '',
};

// ── Helpers ──

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildTree(categories: CourseCategory[], parentId: string = ''): (CourseCategory & { children: CourseCategory[] })[] {
  return categories
    .filter((c) => (c.parentId || '') === parentId)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id) as any,
    }));
}

// ── Component ──

export default function CourseCategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'course_categories'],
    queryFn: () => settingsApi.get('course_categories').catch((): CategoryRegistry => ({ categories: [] })),
  });

  const categories: CourseCategory[] = (registry as CategoryRegistry)?.categories || [];
  const tree = buildTree(categories);

  const saveMutation = useMutation({
    mutationFn: (updated: CourseCategory[]) =>
      settingsApi.update('course_categories', { categories: updated } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'course_categories'] });
      toast.success(editingId ? 'Category updated' : 'Category created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: CourseCategory) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentId: cat.parentId || '',
      image: cat.image || '',
      seoTitle: cat.seo?.title || '',
      seoDescription: cat.seo?.description || '',
      seoKeywords: cat.seo?.keywords || '',
      seoOgImage: cat.seo?.ogImage || '',
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const slug = form.slug || autoSlug(form.name);
    const seo = {
      title: form.seoTitle,
      description: form.seoDescription,
      keywords: form.seoKeywords,
      ogImage: form.seoOgImage,
    };

    if (editingId) {
      const updated = categories.map((c) =>
        c.id === editingId
          ? { ...c, name: form.name, slug, description: form.description, parentId: form.parentId, image: form.image, seo }
          : c
      );
      saveMutation.mutate(updated);
    } else {
      const newCat: CourseCategory = {
        id: crypto.randomUUID(),
        name: form.name,
        slug,
        description: form.description,
        parentId: form.parentId,
        image: form.image,
        position: categories.length,
        seo,
      };
      saveMutation.mutate([...categories, newCat]);
    }
  };

  const deleteCategory = (id: string, name: string) => {
    const hasChildren = categories.some((c) => c.parentId === id);
    if (hasChildren) {
      toast.error('Cannot delete a category that has subcategories. Remove children first.');
      return;
    }
    if (!confirm(`Delete category "${name}"?`)) return;
    saveMutation.mutate(categories.filter((c) => c.id !== id));
  };

  const moveCategory = (id: string, direction: 'up' | 'down') => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const siblings = categories
      .filter((c) => (c.parentId || '') === (cat.parentId || ''))
      .sort((a, b) => a.position - b.position);
    const idx = siblings.findIndex((c) => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const current = siblings[idx];
    const swap = siblings[swapIdx];
    if (!current || !swap) return;

    const updated = categories.map((c) => {
      if (c.id === current.id) return { ...c, position: swap.position };
      if (c.id === swap.id) return { ...c, position: current.position };
      return c;
    });
    saveMutation.mutate(updated);
  };

  const isPending = saveMutation.isPending;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Manage categories for organizing courses</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Category
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Category' : 'New Category'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: f.slug === autoSlug(f.name) || !f.slug ? autoSlug(name) : f.slug,
                  }));
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Category</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">None (top-level)</option>
                {categories
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional description for this category"
            />
          </div>
          <div className="mt-4">
            <MediaPicker
              label="Category Image"
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              accept="image/*"
              helpText="Displayed on category archive pages and in category listings"
            />
          </div>

          {/* SEO */}
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-700">SEO Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Category page title for search engines"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">{form.seoTitle.length}/60 characters</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">SEO Description</label>
                <textarea
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Meta description for this category page"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">{form.seoDescription.length}/160 characters</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Keywords</label>
                <input
                  type="text"
                  value={form.seoKeywords}
                  onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Comma-separated keywords"
                />
              </div>
              <div>
                <MediaPicker
                  label="OG Image"
                  value={form.seoOgImage}
                  onChange={(v) => setForm({ ...form, seoOgImage: v })}
                  accept="image/*"
                  helpText="Image displayed when shared on social media (recommended 1200x630)"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category Tree */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading categories...</div>
      ) : tree.length ? (
        <div className="rounded-lg bg-white shadow">
          <CategoryTree
            nodes={tree}
            onEdit={startEdit}
            onDelete={deleteCategory}
            onMove={moveCategory}
            depth={0}
          />
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No course categories yet.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create Your First Category
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tree Component ──

function CategoryTree({
  nodes,
  onEdit,
  onDelete,
  onMove,
  depth,
}: {
  nodes: (CourseCategory & { children: CourseCategory[] })[];
  onEdit: (cat: CourseCategory) => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  depth: number;
}) {
  return (
    <ul className={depth > 0 ? 'border-l border-gray-100 ml-6' : ''}>
      {nodes.map((node, i) => (
        <li key={node.id}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              {depth > 0 && <span className="text-gray-300">&mdash;</span>}
              {node.image && (
                <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden shrink-0">
                  IMG
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">{node.name}</span>
              <span className="text-xs font-mono text-gray-400">/{node.slug}</span>
              {node.description && (
                <span className="ml-2 text-xs text-gray-400 truncate max-w-xs">{node.description}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onMove(node.id, 'up')}
                disabled={i === 0}
                className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                title="Move up"
              >
                &uarr;
              </button>
              <button
                onClick={() => onMove(node.id, 'down')}
                disabled={i === nodes.length - 1}
                className="rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                title="Move down"
              >
                &darr;
              </button>
              <button
                onClick={() => onEdit(node)}
                className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(node.id, node.name)}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
          {node.children && node.children.length > 0 && (
            <CategoryTree nodes={node.children as any} onEdit={onEdit} onDelete={onDelete} onMove={onMove} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
