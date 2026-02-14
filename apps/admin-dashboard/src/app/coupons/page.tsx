'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { couponsApi, productsApi, categoriesApi } from '@/lib/api-client';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
];

const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All Products', desc: 'Coupon applies to everything in the cart' },
  { value: 'specific_products', label: 'Specific Products', desc: 'Only applies to selected products' },
  { value: 'specific_categories', label: 'Specific Categories', desc: 'Only applies to products in selected categories' },
];

const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'service', label: 'Service' },
  { value: 'configurable', label: 'Configurable' },
  { value: 'course', label: 'Course' },
];

function formatDiscount(type: string, value: number): string {
  if (type === 'percentage') return `${(value / 100).toFixed(0)}%`;
  if (type === 'fixed_amount') return `$${(value / 100).toFixed(2)}`;
  if (type === 'buy_x_get_y') return `Buy X Get Y (${(value / 100).toFixed(0)}% off)`;
  return 'Free Shipping';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  appliesTo: 'all',
  productIds: [] as string[],
  categoryIds: [] as string[],
  productTypes: [] as string[],
  excludedProductIds: [] as string[],
  excludedCategoryIds: [] as string[],
  minOrderAmount: '',
  maxOrderAmount: '',
  minItemCount: '',
  maxUsageCount: '',
  usagePerUser: '',
  stackable: false,
  stackGroup: '',
  priority: '0',
  buyXQuantity: '',
  getYQuantity: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeSection, setActiveSection] = useState<string>('basics');

  const { data, isLoading } = useQuery({
    queryKey: ['coupons', { page }],
    queryFn: () => couponsApi.list({ page, limit: 20 }),
  });

  // Products & categories for pickers
  const { data: productsData } = useQuery({
    queryKey: ['products', 'picker'],
    queryFn: () => productsApi.list({ limit: 200 }),
    enabled: showForm,
  });

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree(),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => couponsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => couponsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setActiveSection('basics');
  };

  const startEdit = (coupon: any) => {
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountType === 'percentage'
        ? String(coupon.discountValue / 100)
        : coupon.discountType === 'free_shipping'
          ? ''
          : String(coupon.discountValue / 100),
      maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount / 100) : '',
      appliesTo: coupon.appliesTo || 'all',
      productIds: coupon.productIds || [],
      categoryIds: coupon.categoryIds || [],
      productTypes: coupon.productTypes || [],
      excludedProductIds: coupon.excludedProductIds || [],
      excludedCategoryIds: coupon.excludedCategoryIds || [],
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount / 100) : '',
      maxOrderAmount: coupon.maxOrderAmount ? String(coupon.maxOrderAmount / 100) : '',
      minItemCount: coupon.minItemCount ? String(coupon.minItemCount) : '',
      maxUsageCount: coupon.maxUsageCount ? String(coupon.maxUsageCount) : '',
      usagePerUser: coupon.usagePerUser ? String(coupon.usagePerUser) : '',
      stackable: coupon.stackable ?? false,
      stackGroup: coupon.stackGroup || '',
      priority: String(coupon.priority ?? 0),
      buyXQuantity: coupon.buyXQuantity ? String(coupon.buyXQuantity) : '',
      getYQuantity: coupon.getYQuantity ? String(coupon.getYQuantity) : '',
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
      isActive: coupon.isActive,
    });
    setEditingId(coupon.id);
    setShowForm(true);
    setActiveSection('basics');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(form.discountValue || '0');
    const payload: any = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: form.discountType === 'percentage'
        ? Math.round(val * 100)
        : form.discountType === 'free_shipping'
          ? 0
          : Math.round(val * 100),
      maxDiscountAmount: form.maxDiscountAmount ? Math.round(parseFloat(form.maxDiscountAmount) * 100) : null,
      appliesTo: form.appliesTo,
      productIds: form.appliesTo === 'specific_products' ? form.productIds : [],
      categoryIds: form.appliesTo === 'specific_categories' ? form.categoryIds : [],
      productTypes: form.productTypes.length > 0 ? form.productTypes : [],
      excludedProductIds: form.excludedProductIds,
      excludedCategoryIds: form.excludedCategoryIds,
      minOrderAmount: form.minOrderAmount ? Math.round(parseFloat(form.minOrderAmount) * 100) : null,
      maxOrderAmount: form.maxOrderAmount ? Math.round(parseFloat(form.maxOrderAmount) * 100) : null,
      minItemCount: form.minItemCount ? parseInt(form.minItemCount) : null,
      maxUsageCount: form.maxUsageCount ? parseInt(form.maxUsageCount) : null,
      usagePerUser: form.usagePerUser ? parseInt(form.usagePerUser) : null,
      stackable: form.stackable,
      stackGroup: form.stackGroup || null,
      priority: parseInt(form.priority) || 0,
      buyXQuantity: form.discountType === 'buy_x_get_y' && form.buyXQuantity ? parseInt(form.buyXQuantity) : null,
      getYQuantity: form.discountType === 'buy_x_get_y' && form.getYQuantity ? parseInt(form.getYQuantity) : null,
      startsAt: form.startsAt || undefined,
      expiresAt: form.expiresAt || undefined,
      isActive: form.isActive,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleArrayItem = (field: keyof typeof form, id: string) => {
    const arr = form[field] as string[];
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    setForm({ ...form, [field]: next });
  };

  const allProducts = productsData?.data || [];
  const flatCats = flattenTree(categoryTree || []);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const FORM_SECTIONS = [
    { key: 'basics', label: 'Basics' },
    { key: 'targeting', label: 'Targeting' },
    { key: 'exclusions', label: 'Exclusions' },
    { key: 'thresholds', label: 'Thresholds' },
    { key: 'limits', label: 'Limits' },
    { key: 'stacking', label: 'Stacking' },
    { key: 'schedule', label: 'Schedule' },
  ];

  // Count configured rules for badge display
  const targetingCount =
    (form.appliesTo !== 'all' ? 1 : 0) +
    (form.productTypes.length > 0 ? 1 : 0);
  const exclusionCount =
    (form.excludedProductIds.length > 0 ? 1 : 0) +
    (form.excludedCategoryIds.length > 0 ? 1 : 0);
  const thresholdCount =
    (form.minOrderAmount ? 1 : 0) +
    (form.maxOrderAmount ? 1 : 0) +
    (form.minItemCount ? 1 : 0) +
    (form.maxDiscountAmount ? 1 : 0);
  const limitCount =
    (form.maxUsageCount ? 1 : 0) +
    (form.usagePerUser ? 1 : 0);
  const stackCount = form.stackable ? 1 : 0;
  const scheduleCount =
    (form.startsAt ? 1 : 0) +
    (form.expiresAt ? 1 : 0);

  const badgeCounts: Record<string, number> = {
    targeting: targetingCount,
    exclusions: exclusionCount,
    thresholds: thresholdCount,
    limits: limitCount,
    stacking: stackCount,
    schedule: scheduleCount,
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage discount coupons with advanced targeting rules.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Coupon
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {editingId ? 'Edit Coupon' : 'New Coupon'}
            </h2>
          </div>

          {/* Section Tabs */}
          <div className="border-b border-gray-200 px-5">
            <nav className="-mb-px flex gap-4 overflow-x-auto">
              {FORM_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={clsx(
                    'whitespace-nowrap border-b-2 py-3 text-xs font-medium transition-colors',
                    activeSection === s.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  )}
                >
                  {s.label}
                  {(badgeCounts[s.key] ?? 0) > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-600">
                      {badgeCounts[s.key]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-5">
            {/* ── BASICS ── */}
            {activeSection === 'basics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                    <input
                      type="text"
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="SUMMER2025"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Discount Type</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {DISCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {form.discountType === 'percentage' ? 'Discount (%)' :
                       form.discountType === 'fixed_amount' ? 'Discount ($)' :
                       form.discountType === 'buy_x_get_y' ? 'Discount on Y items (%)' :
                       'Value'}
                    </label>
                    <input
                      type="number"
                      step={form.discountType === 'percentage' || form.discountType === 'buy_x_get_y' ? '1' : '0.01'}
                      min="0"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={form.discountType === 'percentage' ? '10' : '5.00'}
                      disabled={form.discountType === 'free_shipping'}
                    />
                  </div>
                </div>

                {/* Buy X Get Y fields */}
                {form.discountType === 'buy_x_get_y' && (
                  <div className="grid grid-cols-2 gap-4 rounded-md border border-blue-100 bg-blue-50 p-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Buy X Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={form.buyXQuantity}
                        onChange={(e) => setForm({ ...form, buyXQuantity: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Get Y Quantity (discounted)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.getYQuantity}
                        onChange={(e) => setForm({ ...form, getYQuantity: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="e.g. 1"
                      />
                    </div>
                    <p className="col-span-2 text-[10px] text-gray-500">
                      Customer buys X items and gets Y items at the discounted percentage above.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional internal description"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>
            )}

            {/* ── TARGETING ── */}
            {activeSection === 'targeting' && (
              <div className="space-y-5">
                {/* Applies To */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-2">Applies To</label>
                  <div className="grid grid-cols-3 gap-2">
                    {APPLIES_TO_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, appliesTo: opt.value })}
                        className={clsx(
                          'rounded-lg border-2 p-3 text-left transition-colors',
                          form.appliesTo === opt.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300',
                        )}
                      >
                        <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Picker */}
                {form.appliesTo === 'specific_products' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Select Products ({form.productIds.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                      {allProducts.length > 0 ? allProducts.map((p: any) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            checked={form.productIds.includes(p.id)}
                            onChange={() => toggleArrayItem('productIds', p.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto text-[10px] font-mono text-gray-400">{p.sku}</span>
                        </label>
                      )) : (
                        <p className="text-xs text-gray-400 py-2 text-center">No products available.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Picker */}
                {form.appliesTo === 'specific_categories' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Select Categories ({form.categoryIds.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                      {flatCats.length > 0 ? flatCats.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            checked={form.categoryIds.includes(cat.id)}
                            onChange={() => toggleArrayItem('categoryIds', cat.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span style={{ paddingLeft: `${cat.depth * 12}px` }}>{cat.name}</span>
                        </label>
                      )) : (
                        <p className="text-xs text-gray-400 py-2 text-center">
                          No categories yet. <a href="/categories" className="text-blue-500 hover:underline">Create categories</a> first.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Type Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    Restrict to Product Types
                    <span className="ml-1 font-normal text-gray-400">(optional — empty means all types)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => toggleArrayItem('productTypes', pt.value)}
                        className={clsx(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          form.productTypes.includes(pt.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── EXCLUSIONS ── */}
            {activeSection === 'exclusions' && (
              <div className="space-y-5">
                <p className="text-xs text-gray-500">
                  Exclude specific products or categories from this coupon even if they otherwise qualify.
                </p>

                {/* Excluded Products */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Excluded Products ({form.excludedProductIds.length} excluded)
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                    {allProducts.length > 0 ? allProducts.map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={form.excludedProductIds.includes(p.id)}
                          onChange={() => toggleArrayItem('excludedProductIds', p.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto text-[10px] font-mono text-gray-400">{p.sku}</span>
                      </label>
                    )) : (
                      <p className="text-xs text-gray-400 py-2 text-center">No products available.</p>
                    )}
                  </div>
                </div>

                {/* Excluded Categories */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Excluded Categories ({form.excludedCategoryIds.length} excluded)
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                    {flatCats.length > 0 ? flatCats.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={form.excludedCategoryIds.includes(cat.id)}
                          onChange={() => toggleArrayItem('excludedCategoryIds', cat.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span style={{ paddingLeft: `${cat.depth * 12}px` }}>{cat.name}</span>
                      </label>
                    )) : (
                      <p className="text-xs text-gray-400 py-2 text-center">No categories available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── THRESHOLDS ── */}
            {activeSection === 'thresholds' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Set minimum and maximum cart requirements for this coupon to be valid.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Order Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.minOrderAmount}
                        onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                        className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="No minimum"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">Cart must be at least this amount</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Order Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.maxOrderAmount}
                        onChange={(e) => setForm({ ...form, maxOrderAmount: e.target.value })}
                        className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="No maximum"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">Coupon invalid if cart exceeds this amount</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Item Count</label>
                    <input
                      type="number"
                      min="1"
                      value={form.minItemCount}
                      onChange={(e) => setForm({ ...form, minItemCount: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="No minimum"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">Minimum qualifying items in cart</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Discount Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.maxDiscountAmount}
                        onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                        className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="No cap"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">Cap on the discount (useful for percentage coupons)</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── LIMITS ── */}
            {activeSection === 'limits' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Control how many times this coupon can be redeemed.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxUsageCount}
                      onChange={(e) => setForm({ ...form, maxUsageCount: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Unlimited"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">Total times this coupon can be used across all customers</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Per-Customer Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={form.usagePerUser}
                      onChange={(e) => setForm({ ...form, usagePerUser: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Unlimited"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">Maximum times a single customer can use this coupon</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STACKING ── */}
            {activeSection === 'stacking' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Control whether this coupon can be combined with other coupons at checkout.
                </p>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allow Stacking</p>
                    <p className="text-xs text-gray-500">
                      When enabled, this coupon can be combined with other stackable coupons at checkout.
                    </p>
                  </div>
                </label>

                {form.stackable && (
                  <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stack Group</label>
                      <input
                        type="text"
                        value={form.stackGroup}
                        onChange={(e) => setForm({ ...form, stackGroup: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. percentage_discounts"
                      />
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Coupons in the same group cannot be combined. Leave empty to allow stacking with any other stackable coupon.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                      <input
                        type="number"
                        min="0"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="0"
                      />
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Higher priority coupons are applied first when stacking. Default is 0.
                      </p>
                    </div>
                  </div>
                )}

                {!form.stackable && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">
                      This coupon cannot be combined with any other coupon. If a customer has already applied another coupon, this one will be rejected.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── SCHEDULE ── */}
            {activeSection === 'schedule' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Set when this coupon becomes valid and when it expires.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Starts At</label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">Leave empty for immediate availability</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Expires At</label>
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">Leave empty for no expiration</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading coupons...</div>
      ) : data?.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Targeting</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Valid</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((coupon: any) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                const isMaxed = coupon.maxUsageCount && coupon.currentUsage >= coupon.maxUsageCount;
                const targeting = coupon.appliesTo || 'all';
                const hasExclusions = (coupon.excludedProductIds?.length > 0) || (coupon.excludedCategoryIds?.length > 0);
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-gray-900">{coupon.code}</span>
                      {coupon.description && (
                        <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[200px]">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700">
                        {formatDiscount(coupon.discountType, coupon.discountValue)}
                      </span>
                      {coupon.maxDiscountAmount > 0 && (
                        <p className="text-[10px] text-gray-400">max ${(coupon.maxDiscountAmount / 100).toFixed(0)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={clsx(
                          'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                          targeting === 'all' ? 'bg-gray-100 text-gray-600' :
                          targeting === 'specific_products' ? 'bg-blue-100 text-blue-600' :
                          'bg-purple-100 text-purple-600',
                        )}>
                          {targeting === 'all' ? 'All' :
                           targeting === 'specific_products' ? `${coupon.productIds?.length || 0} products` :
                           `${coupon.categoryIds?.length || 0} categories`}
                        </span>
                        {coupon.stackable && (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            Stackable
                          </span>
                        )}
                        {hasExclusions && (
                          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            Exclusions
                          </span>
                        )}
                        {coupon.minOrderAmount > 0 && (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Min ${(coupon.minOrderAmount / 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {coupon.currentUsage}{coupon.maxUsageCount ? ` / ${coupon.maxUsageCount}` : ''}
                      {coupon.usagePerUser && (
                        <p className="text-[10px] text-gray-400">{coupon.usagePerUser}/user</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span>{formatDate(coupon.startsAt)}</span>
                      <span className="mx-1 text-gray-300">-</span>
                      <span>{formatDate(coupon.expiresAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        !coupon.isActive
                          ? 'bg-gray-100 text-gray-500'
                          : isExpired
                            ? 'bg-red-100 text-red-600'
                            : isMaxed
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700',
                      )}>
                        {!coupon.isActive ? 'Inactive' : isExpired ? 'Expired' : isMaxed ? 'Maxed' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(coupon)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete coupon "${coupon.code}"?`)) {
                              deleteMutation.mutate(coupon.id);
                            }
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No coupons yet.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create Your First Coupon
          </button>
        </div>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {data.meta.page} of {data.meta.totalPages}
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

function flattenTree(nodes: any[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}
