'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { categoriesApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  image: string | null;
  children?: CategoryNode[];
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

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: tree, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree().catch(() => [] as any[]),
  });

  const { data: flatList } = useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: () => categoriesApi.list({ limit: 200 }).catch(() => ({ data: [], meta: { page: 1, limit: 200, total: 0, totalPages: 0 } })),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: any) => {
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
    const hasSeo = form.seoTitle || form.seoDescription || form.seoKeywords || form.seoOgImage;
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined,
      parentId: form.parentId || undefined,
      image: form.image || undefined,
      seo: hasSeo ? {
        title: form.seoTitle || undefined,
        description: form.seoDescription || undefined,
        keywords: form.seoKeywords || undefined,
        ogImage: form.seoOgImage || undefined,
      } : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const allCategories = flatList?.data || [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Organize products into a category hierarchy.</p>
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                {allCategories
                  .filter((c: any) => c.id !== editingId)
                  .map((c: any) => (
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
              placeholder="Optional description"
            />
          </div>
          <div className="mt-4">
            <MediaPicker
              label="Category Image"
              value={form.image}
              onChange={(v) => setForm({ ...form, image: v })}
              accept="image/*"
              helpText="Displayed on category pages and in category listings"
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
      ) : tree?.length ? (
        <div className="rounded-lg bg-white shadow">
          <CategoryTree
            nodes={tree}
            onEdit={startEdit}
            onDelete={(id, name) => {
              if (confirm(`Delete category "${name}"? It must have no children.`)) {
                deleteMutation.mutate(id);
              }
            }}
            depth={0}
          />
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No categories yet.</p>
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

function CategoryTree({
  nodes,
  onEdit,
  onDelete,
  depth,
}: {
  nodes: CategoryNode[];
  onEdit: (cat: CategoryNode) => void;
  onDelete: (id: string, name: string) => void;
  depth: number;
}) {
  return (
    <ul className={depth > 0 ? 'border-l border-gray-100 ml-6' : ''}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              {depth > 0 && <span className="text-gray-300">&mdash;</span>}
              <span className="text-sm font-medium text-gray-900">{node.name}</span>
              <span className="text-xs font-mono text-gray-400">/{node.slug}</span>
              {node.description && (
                <span className="ml-2 text-xs text-gray-400 truncate max-w-xs">{node.description}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
            <CategoryTree nodes={node.children} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
