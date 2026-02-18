'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

// ── Types ──

interface CourseTag {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  color: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

interface TagRegistry {
  tags: CourseTag[];
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  image: '',
  color: '#6b7280',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoOgImage: '',
};

const TAG_COLORS = [
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

export default function CourseTagsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'course_tags'],
    queryFn: () => settingsApi.get('course_tags').catch((): TagRegistry => ({ tags: [] })),
  });

  const tags: CourseTag[] = (registry as TagRegistry)?.tags || [];

  const filtered = search
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()))
    : tags;

  const saveMutation = useMutation({
    mutationFn: (updated: CourseTag[]) =>
      settingsApi.update('course_tags', { tags: updated } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'course_tags'] });
      toast.success(editingId ? 'Tag updated' : 'Tag created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (tag: CourseTag) => {
    setForm({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      image: tag.image || '',
      color: tag.color || '#6b7280',
      seoTitle: tag.seo?.title || '',
      seoDescription: tag.seo?.description || '',
      seoKeywords: tag.seo?.keywords || '',
      seoOgImage: tag.seo?.ogImage || '',
    });
    setEditingId(tag.id);
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
      const updated = tags.map((t) =>
        t.id === editingId
          ? { ...t, name: form.name, slug, description: form.description, image: form.image, color: form.color, seo }
          : t
      );
      saveMutation.mutate(updated);
    } else {
      // Check for duplicate
      if (tags.some((t) => t.slug === slug)) {
        toast.error(`A tag with slug "${slug}" already exists`);
        return;
      }
      const newTag: CourseTag = {
        id: crypto.randomUUID(),
        name: form.name,
        slug,
        description: form.description,
        image: form.image,
        color: form.color,
        seo,
      };
      saveMutation.mutate([...tags, newTag]);
    }
  };

  const deleteTag = (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return;
    saveMutation.mutate(tags.filter((t) => t.id !== id));
  };

  const isPending = saveMutation.isPending;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Tags</h1>
          <p className="mt-1 text-sm text-gray-500">Manage tags for organizing and filtering courses</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Tag
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Tag' : 'New Tag'}
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
                placeholder="Tag name"
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
                placeholder="Optional description for this tag"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tag Color</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TAG_COLORS.map((c) => (
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
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-7 w-7 rounded border border-gray-300 cursor-pointer"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <MediaPicker
              label="Tag Image"
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              accept="image/*"
              helpText="Displayed on the tag archive page"
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
                  placeholder="Tag page title for search engines"
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
                  placeholder="Meta description for this tag page"
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

      {/* Search */}
      {tags.length > 5 && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Search tags..."
          />
        </div>
      )}

      {/* Tags Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading tags...</div>
      ) : filtered.length ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Tag</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">SEO</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag) => (
                <tr key={tag.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      />
                      <span className="font-medium text-gray-900">{tag.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">/{tag.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 truncate max-w-xs block">
                      {tag.description || '\u2014'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tag.seo?.title || tag.seo?.description ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Configured
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(tag)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id, tag.name)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tags.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No course tags yet.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create Your First Tag
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No tags match &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Stats */}
      {tags.length > 0 && (
        <div className="mt-4 text-xs text-gray-400">
          {tags.length} tag{tags.length !== 1 ? 's' : ''} total
        </div>
      )}
    </div>
  );
}
