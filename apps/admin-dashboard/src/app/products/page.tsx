'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { productsApi } from '@/lib/api-client';

const PRODUCT_TYPES = [
  { label: 'All', value: '' },
  { label: 'Physical', value: 'physical' },
  { label: 'Virtual', value: 'virtual' },
  { label: 'Service', value: 'service' },
  { label: 'Configurable', value: 'configurable' },
  { label: 'Course', value: 'course' },
];

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={clsx('inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize', colors[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    physical: 'bg-blue-50 text-blue-700',
    virtual: 'bg-purple-50 text-purple-700',
    service: 'bg-teal-50 text-teal-700',
    configurable: 'bg-orange-50 text-orange-700',
    course: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <span className={clsx('inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize', colors[type] || 'bg-gray-100 text-gray-700')}>
      {type}
    </span>
  );
}

export default function ProductsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, type: typeFilter, status: statusFilter }],
    queryFn: () =>
      productsApi.list({
        page,
        limit: 20,
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product catalog across all types.
          </p>
        </div>
        <Link
          href="/products/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products..."
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
        <div className="flex gap-1">
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTypeFilter(t.value); setPage(1); }}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === t.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading products...</div>
      ) : data?.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/products/${product.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {product.name}
                    </Link>
                    {product.shortDescription && (
                      <p className="mt-0.5 text-xs text-gray-400 truncate max-w-xs">{product.shortDescription}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{product.sku}</td>
                  <td className="px-4 py-3">{typeBadge(product.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {product.pricing?.basePrice != null
                      ? formatPrice(product.pricing.basePrice, product.pricing.currency)
                      : '—'}
                    {product.pricing?.salePrice != null && (
                      <span className="ml-1 text-xs text-red-500">
                        {formatPrice(product.pricing.salePrice, product.pricing.currency)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(product.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${product.name}"?`)) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No products found.</p>
          <Link
            href="/products/new"
            className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create Your First Product
          </Link>
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} products)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.meta.totalPages}
              className="rounded-md bg-white px-3 py-1.5 text-xs shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
