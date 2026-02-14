'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { productsApi } from '@/lib/api-client';
import { ProductForm } from '@/components/ProductForm';

function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'details' | 'variants'>('details');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
      router.push('/products');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-96 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-1 text-xs font-mono text-gray-400">SKU: {product.sku}</p>
        </div>
        <button
          onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(); }}
          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Delete Product
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6">
          {(['details', 'variants'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'border-b-2 pb-2 text-sm font-medium transition-colors capitalize',
                tab === t
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'details' && (
        <ProductForm
          initialData={product}
          onSubmit={(data) => updateMutation.mutate(data)}
          isPending={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      )}

      {tab === 'variants' && (
        <VariantsTab productId={id} product={product} />
      )}
    </div>
  );
}

function VariantsTab({ productId, product }: { productId: string; product: any }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newVariant, setNewVariant] = useState({ sku: '', attributes: '{}', priceOverride: '' });

  const { data: variants, isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => productsApi.listVariants(productId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => productsApi.createVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast.success('Variant created');
      setShowAdd(false);
      setNewVariant({ sku: '', attributes: '{}', priceOverride: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => productsApi.generateVariants(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast.success('Variants generated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddVariant = () => {
    let attributes: Record<string, string>;
    try {
      attributes = JSON.parse(newVariant.attributes);
    } catch {
      toast.error('Invalid JSON for attributes');
      return;
    }
    createMutation.mutate({
      sku: newVariant.sku,
      attributes,
      priceOverride: newVariant.priceOverride ? Math.round(parseFloat(newVariant.priceOverride) * 100) : undefined,
    });
  };

  const variantAttrs = product.variantAttrs || [];

  return (
    <div className="max-w-3xl space-y-4">
      {/* Variant Attributes Info */}
      {variantAttrs.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-xs font-semibold text-gray-900 mb-2">Variant Attributes</h3>
          <div className="flex flex-wrap gap-3">
            {variantAttrs.map((attr: any) => (
              <div key={attr.slug} className="text-xs">
                <span className="font-medium text-gray-700">{attr.name}:</span>{' '}
                <span className="text-gray-500">{attr.values?.join(', ')}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="mt-3 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating...' : 'Auto-Generate Variants'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {showAdd ? 'Cancel' : 'Add Variant'}
        </button>
      </div>

      {/* Add Variant Form */}
      {showAdd && (
        <div className="rounded-lg bg-white p-4 shadow space-y-3">
          <h3 className="text-xs font-semibold text-gray-900">New Variant</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                value={newVariant.sku}
                onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                placeholder="VARIANT-SKU"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Attributes (JSON)</label>
              <input
                type="text"
                value={newVariant.attributes}
                onChange={(e) => setNewVariant({ ...newVariant, attributes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                placeholder='{"color":"red","size":"L"}'
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price Override ($)</label>
              <input
                type="number"
                step="0.01"
                value={newVariant.priceOverride}
                onChange={(e) => setNewVariant({ ...newVariant, priceOverride: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                placeholder="Leave empty for base price"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddVariant}
              disabled={!newVariant.sku || createMutation.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Variant'}
            </button>
          </div>
        </div>
      )}

      {/* Variants List */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading variants...</p>
      ) : variants?.length ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Attributes</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Price Override</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {variants.map((v: any) => (
                <tr key={v.variantId || v.sku} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs font-mono text-gray-700">{v.sku}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(v.attributes || {}).map(([key, val]) => (
                        <span key={key} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          {key}: {String(val)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-700">
                    {v.priceOverride != null ? formatPrice(v.priceOverride) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={clsx(
                      'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                      v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {v.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No variants yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            {variantAttrs.length > 0
              ? 'Use "Auto-Generate Variants" or add variants manually.'
              : 'Define variant attributes on the product first, then add variants.'}
          </p>
        </div>
      )}
    </div>
  );
}
