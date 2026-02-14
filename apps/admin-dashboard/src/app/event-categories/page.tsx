'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

// ── Types ──

interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  color: string;
  parentId: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

interface CategoryRegistry {
  categories: EventCategory[];
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  image: '',
  color: '#6b7280',
  parentId: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoOgImage: '',
};

const CATEGORY_COLORS = [
  { value: '#6b7280', label: 'Gray' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
];

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Component ──

export default function EventCategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'event_categories'],
    queryFn: () => settingsApi.get('event_categories').catch((): CategoryRegistry => ({ categories: [] })),
  });

  const categories: EventCategory[] = (registry as CategoryRegistry)?.categories || [];

  const filtered = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()))
    : categories;

  const saveMutation = useMutation({
    mutationFn: (updated: EventCategory[]) =>
      settingsApi.update('event_categories', { categories: updated } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'event_categories'] });
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

  const startEdit = (cat: EventCategory) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      color: cat.color || '#6b7280',
      parentId: cat.parentId || '',
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
          ? { ...c, name: form.name, slug, description: form.description, image: form.image, color: form.color, parentId: form.parentId, seo }
          : c
      );
      saveMutation.mutate(updated);
    } else {
      if (categories.some((c) => c.slug === slug)) {
        toast.error(`A category with slug "${slug}" already exists`);
        return;
      }
      const newCat: EventCategory = {
        id: crypto.randomUUID(),
        name: form.name,
        slug,
        description: form.description,
        image: form.image,
        color: form.color,
        parentId: form.parentId,
        seo,
      };
      saveMutation.mutate([...categories, newCat]);
    }
  };

  const deleteCategory = (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    saveMutation.mutate(categories.filter((c) => c.id !== id));
  };

  const isPending = saveMutation.isPending;

  // Build parent tree
  const topLevel = filtered.filter((c) => !c.parentId);
  const getChildren = (parentId: string) => filtered.filter((c) => c.parentId === parentId);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Organize events into categories like Conference, Workshop, Meetup</p>
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
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Parent Category</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None (top-level)</option>
                {categories.filter((c) => c.id !== editingId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    form.color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-7 w-7 rounded border border-gray-300 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          <div className="mt-4">
            <MediaPicker
              label="Category Image"
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              accept="image/*"
              helpText="Displayed on the category archive page"
            />
          </div>

          {/* SEO */}
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-700">SEO Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">SEO Title</label>
                <input type="text" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <p className="mt-0.5 text-[10px] text-gray-400">{form.seoTitle.length}/60 characters</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">SEO Description</label>
                <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <p className="mt-0.5 text-[10px] text-gray-400">{form.seoDescription.length}/160 characters</p>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Keywords</label>
                <input type="text" value={form.seoKeywords} onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Comma-separated" />
              </div>
              <MediaPicker label="OG Image" value={form.seoOgImage} onChange={(v) => setForm({ ...form, seoOgImage: v })} accept="image/*" helpText="Recommended 1200x630" />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      {categories.length > 5 && (
        <div className="mb-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Search categories..." />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading categories...</div>
      ) : filtered.length ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Parent</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">SEO</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat) => {
                const parent = categories.find((c) => c.id === cat.parentId);
                return (
                  <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6b7280' }} />
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-400">/{cat.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{parent?.name || '\u2014'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {cat.seo?.title || cat.seo?.description ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Configured</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(cat)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                        <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No event categories yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Create Your First Category
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No categories match &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-4 text-xs text-gray-400">
          {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} total
        </div>
      )}
    </div>
  );
}
