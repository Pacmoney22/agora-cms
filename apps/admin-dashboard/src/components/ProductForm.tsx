'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { categoriesApi, coursesApi, productsApi, settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical', desc: 'Tangible goods requiring shipping' },
  { value: 'virtual', label: 'Virtual / Digital', desc: 'Downloads, license keys, digital content' },
  { value: 'service', label: 'Service', desc: 'Appointments, subscriptions, projects' },
  { value: 'configurable', label: 'Configurable', desc: 'Products with multi-step configuration' },
  { value: 'course', label: 'Course', desc: 'Educational course linked to LMS' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'];
const PRICING_MODELS = [
  { value: 'one_time', label: 'One Time' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'tiered', label: 'Tiered' },
  { value: 'per_unit', label: 'Per Unit' },
];
const TAX_CATEGORIES = [
  { value: 'standard', label: 'Standard' },
  { value: 'digital_goods', label: 'Digital Goods' },
  { value: 'services_exempt', label: 'Services (Exempt)' },
];
const DELIVERY_METHODS = [
  { value: 'download', label: 'Download' },
  { value: 'license_key', label: 'License Key' },
  { value: 'email_content', label: 'Email Content' },
  { value: 'external_url', label: 'External URL' },
];
const SERVICE_TYPES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'project', label: 'Project' },
];
const CANCELLATION_POLICIES = [
  { value: 'flexible', label: 'Flexible' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strict', label: 'Strict' },
];
const DISPLAY_TYPES = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'swatch', label: 'Color Swatch' },
  { value: 'button', label: 'Button' },
];
const PRICING_STRATEGIES = [
  { value: 'additive', label: 'Additive — base price + option modifiers' },
  { value: 'override', label: 'Override — option sets final price' },
  { value: 'tiered', label: 'Tiered — price based on combination' },
];
const STEP_TYPES = [
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'product_select', label: 'Product Select' },
];

interface ProductFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
  submitLabel?: string;
}

function centsToDisplay(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number | null {
  if (!display) return null;
  const num = parseFloat(display);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

export function ProductForm({ initialData, onSubmit, isPending, submitLabel = 'Save' }: ProductFormProps) {
  const [form, setForm] = useState(() => ({
    sku: initialData?.sku || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    shortDescription: initialData?.shortDescription || '',
    type: initialData?.type || 'physical',
    status: initialData?.status || 'draft',
    pricing: {
      currency: initialData?.pricing?.currency || 'USD',
      basePrice: centsToDisplay(initialData?.pricing?.basePrice),
      salePrice: centsToDisplay(initialData?.pricing?.salePrice),
      salePriceStart: initialData?.pricing?.salePriceStart || '',
      salePriceEnd: initialData?.pricing?.salePriceEnd || '',
      pricingModel: initialData?.pricing?.pricingModel || 'one_time',
      recurringInterval: initialData?.pricing?.recurringInterval || '',
      taxCategory: initialData?.pricing?.taxCategory || 'standard',
    },
    shipping: {
      requiresShipping: initialData?.shipping?.requiresShipping ?? true,
      weight: { value: initialData?.shipping?.weight?.value ?? 0, unit: initialData?.shipping?.weight?.unit || 'g' },
      dimensions: {
        length: initialData?.shipping?.dimensions?.length ?? 0,
        width: initialData?.shipping?.dimensions?.width ?? 0,
        height: initialData?.shipping?.dimensions?.height ?? 0,
        unit: initialData?.shipping?.dimensions?.unit || 'cm',
      },
      shippingClass: initialData?.shipping?.shippingClass || 'standard',
      originWarehouse: initialData?.shipping?.originWarehouse || 'default',
      freeShippingEligible: initialData?.shipping?.freeShippingEligible ?? false,
    },
    digital: {
      deliveryMethod: initialData?.digital?.deliveryMethod || 'download',
      accessUrl: initialData?.digital?.accessUrl || '',
    },
    service: {
      serviceType: initialData?.service?.serviceType || 'appointment',
      // Appointment fields
      durationMinutes: initialData?.service?.durationMinutes ?? 60,
      capacityPerSlot: initialData?.service?.capacityPerSlot ?? 1,
      bookingLeadTimeHours: initialData?.service?.bookingLeadTimeHours ?? 24,
      // Subscription fields
      billingInterval: initialData?.service?.billingInterval || 'monthly',
      trialPeriodDays: initialData?.service?.trialPeriodDays ?? 0,
      // Project fields
      estimatedHours: initialData?.service?.estimatedHours ?? 0,
      deliverables: initialData?.service?.deliverables || '',
      // Common
      cancellationPolicy: initialData?.service?.cancellationPolicy || 'flexible',
    },
    course: {
      courseId: initialData?.course?.courseId || '',
      accessDuration: initialData?.course?.accessDuration ?? 0,
      autoEnroll: initialData?.course?.autoEnroll ?? true,
    },
    variantAttrs: (initialData?.variantAttrs || []).map((a: any) => ({
      name: a.name || '',
      slug: a.slug || '',
      values: (a.values || []).join(', '),
      displayType: a.displayType || 'dropdown',
    })),
    configuration: {
      steps: (initialData?.configuration?.steps || []).map((s: any) => ({
        stepId: s.stepId || '',
        label: s.label || '',
        type: s.type || 'single_select',
        required: s.required ?? true,
        maxSelections: s.maxSelections ?? 0,
        options: (s.options || []).map((o: any) => ({
          optionId: o.optionId || '',
          label: o.label || '',
          priceModifier: o.priceModifier != null ? (o.priceModifier / 100).toFixed(2) : '0.00',
          sku_fragment: o.sku_fragment || '',
        })),
      })),
      skuPattern: initialData?.configuration?.skuPattern || '',
      pricingStrategy: initialData?.configuration?.pricingStrategy || 'additive',
      resolvedProductType: initialData?.configuration?.resolvedProductType || 'physical',
      subProducts: (initialData?.configuration?.subProducts || []).map((sp: any) => ({
        productId: sp.productId || '',
        name: sp.name || '',
        sku: sp.sku || '',
        price: sp.price != null ? (sp.price / 100).toFixed(2) : '0.00',
        quantity: sp.quantity ?? 1,
        required: sp.required ?? false,
      })),
    },
    images: initialData?.images || [],
    categories: initialData?.categories?.map((c: any) => c.categoryId || c.id || c) || [],
    tags: initialData?.tags || [],
    seoTitle: initialData?.seo?.title || '',
    seoDescription: initialData?.seo?.description || '',
    seoKeywords: initialData?.seo?.keywords || '',
    seoOgImage: initialData?.seo?.ogImage || '',
  }));

  const { data: categoryTree } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree(),
  });

  const { data: coursesData, error: coursesError } = useQuery({
    queryKey: ['courses', 'picker'],
    queryFn: () => coursesApi.list({ limit: 100 }),
    enabled: form.type === 'course',
    retry: 1,
  });

  // Product search for sub-products and product_select steps
  const [productSearch, setProductSearch] = useState('');
  const [productSearchFocused, setProductSearchFocused] = useState<string | null>(null); // 'sub' or step index

  const { data: productSearchResults } = useQuery({
    queryKey: ['products', 'search', productSearch],
    queryFn: () => productsApi.list({ search: productSearch, limit: 20, status: 'active' }),
    enabled: productSearch.length >= 2 && form.type === 'configurable',
  });

  const searchableProducts: any[] = (productSearchResults as any)?.data || [];

  const { data: productTagsData } = useQuery({
    queryKey: ['settings', 'product_tags'],
    queryFn: () => settingsApi.get('product_tags').catch(() => ({ tags: [] })),
  });
  const productTags: { id: string; name: string; slug: string; color: string }[] = (productTagsData as any)?.tags || [];

  const update = (path: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev };
      const parts = path.split('.');
      let obj: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]!;
        obj[key] = { ...obj[key] };
        obj = obj[key];
      }
      obj[parts[parts.length - 1]!] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      sku: form.sku,
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined,
      shortDescription: form.shortDescription || undefined,
      type: form.type,
      status: form.status,
      pricing: {
        currency: form.pricing.currency,
        basePrice: displayToCents(form.pricing.basePrice) ?? 0,
        salePrice: displayToCents(form.pricing.salePrice),
        salePriceStart: form.pricing.salePriceStart || undefined,
        salePriceEnd: form.pricing.salePriceEnd || undefined,
        pricingModel: form.pricing.pricingModel,
        recurringInterval: form.pricing.pricingModel === 'recurring' ? form.pricing.recurringInterval : undefined,
        taxCategory: form.pricing.taxCategory,
      },
      images: form.images.length ? form.images : undefined,
      categories: form.categories.length ? form.categories : undefined,
      tags: form.tags.length ? form.tags : undefined,
    };

    if (form.type === 'physical') {
      payload.shipping = {
        ...form.shipping,
        weight: { value: Number(form.shipping.weight.value), unit: form.shipping.weight.unit },
        dimensions: {
          length: Number(form.shipping.dimensions.length),
          width: Number(form.shipping.dimensions.width),
          height: Number(form.shipping.dimensions.height),
          unit: form.shipping.dimensions.unit,
        },
      };
    }
    if (form.type === 'virtual') {
      payload.digital = {
        deliveryMethod: form.digital.deliveryMethod,
        accessUrl: form.digital.accessUrl || undefined,
      };
    }
    if (form.type === 'service') {
      const svc: any = {
        serviceType: form.service.serviceType,
        cancellationPolicy: form.service.cancellationPolicy,
      };
      if (form.service.serviceType === 'appointment') {
        svc.durationMinutes = Number(form.service.durationMinutes);
        svc.capacityPerSlot = Number(form.service.capacityPerSlot);
        svc.bookingLeadTimeHours = Number(form.service.bookingLeadTimeHours);
      } else if (form.service.serviceType === 'subscription') {
        svc.billingInterval = form.service.billingInterval;
        svc.trialPeriodDays = Number(form.service.trialPeriodDays);
      } else if (form.service.serviceType === 'project') {
        svc.estimatedHours = Number(form.service.estimatedHours);
        svc.deliverables = form.service.deliverables || undefined;
      }
      payload.service = svc;
    }
    if (form.type === 'course') {
      payload.course = {
        courseId: form.course.courseId,
        accessDuration: Number(form.course.accessDuration),
        autoEnroll: form.course.autoEnroll,
      };
    }

    // Variant attributes (physical/virtual — any type that can have variants)
    if (form.variantAttrs.length > 0 && form.type !== 'configurable') {
      payload.variantAttrs = form.variantAttrs
        .filter((a: any) => a.name && a.values)
        .map((a: any) => ({
          name: a.name,
          slug: a.slug || a.name.toLowerCase().replace(/\s+/g, '_'),
          values: a.values.split(',').map((v: string) => v.trim()).filter(Boolean),
          displayType: a.displayType,
        }));
    }

    // Configuration (configurable only)
    if (form.type === 'configurable') {
      payload.configuration = {
        skuPattern: form.configuration.skuPattern,
        pricingStrategy: form.configuration.pricingStrategy,
        resolvedProductType: form.configuration.resolvedProductType,
        steps: form.configuration.steps.map((s: any) => ({
          stepId: s.stepId || `step-${Math.random().toString(36).slice(2, 8)}`,
          label: s.label,
          type: s.type,
          required: s.required,
          ...(s.type === 'multi_select' && s.maxSelections > 0 ? { maxSelections: Number(s.maxSelections) } : {}),
          ...(s.type === 'product_select'
            ? {
                productIds: s.options
                  .filter((o: any) => o.productId)
                  .map((o: any) => o.productId),
              }
            : {
                options: s.options.map((o: any) => ({
                  optionId: o.optionId || `opt-${Math.random().toString(36).slice(2, 8)}`,
                  label: o.label,
                  priceModifier: Math.round(parseFloat(o.priceModifier || '0') * 100),
                  sku_fragment: o.sku_fragment,
                })),
              }),
        })),
        ...(form.configuration.subProducts.length > 0
          ? {
              subProducts: form.configuration.subProducts.map((sp: any) => ({
                productId: sp.productId,
                quantity: Number(sp.quantity) || 1,
                required: sp.required,
              })),
            }
          : {}),
      };
    }

    // SEO
    const hasSeo = form.seoTitle || form.seoDescription || form.seoKeywords || form.seoOgImage;
    if (hasSeo) {
      payload.seo = {
        title: form.seoTitle || undefined,
        description: form.seoDescription || undefined,
        keywords: form.seoKeywords || undefined,
        ogImage: form.seoOgImage || undefined,
      };
    }

    onSubmit(payload);
  };

  const addImage = () => {
    update('images', [...form.images, { url: '', alt: '', isPrimary: form.images.length === 0 }]);
  };

  const removeImage = (index: number) => {
    const next = form.images.filter((_: any, i: number) => i !== index);
    update('images', next);
  };

  const updateImage = (index: number, field: string, value: unknown) => {
    const next = [...form.images];
    next[index] = { ...next[index], [field]: value };
    update('images', next);
  };

  // --- Variant Attribute helpers ---
  const addVariantAttr = () => {
    update('variantAttrs', [...form.variantAttrs, { name: '', slug: '', values: '', displayType: 'dropdown' }]);
  };
  const removeVariantAttr = (index: number) => {
    update('variantAttrs', form.variantAttrs.filter((_: any, i: number) => i !== index));
  };
  const updateVariantAttr = (index: number, field: string, value: string) => {
    const next = [...form.variantAttrs];
    next[index] = { ...next[index], [field]: value };
    update('variantAttrs', next);
  };

  // --- Configuration helpers ---
  const addConfigStep = () => {
    const steps = [...form.configuration.steps, {
      stepId: '',
      label: '',
      type: 'single_select',
      required: true,
      maxSelections: 0,
      options: [],
    }];
    update('configuration.steps', steps);
  };
  const removeConfigStep = (index: number) => {
    update('configuration.steps', form.configuration.steps.filter((_: any, i: number) => i !== index));
  };
  const updateConfigStep = (index: number, field: string, value: unknown) => {
    const steps = [...form.configuration.steps];
    steps[index] = { ...steps[index], [field]: value };
    update('configuration.steps', steps);
  };
  const addConfigOption = (stepIndex: number) => {
    const steps = [...form.configuration.steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      options: [...steps[stepIndex].options, { optionId: '', label: '', priceModifier: '0.00', sku_fragment: '' }],
    };
    update('configuration.steps', steps);
  };
  const removeConfigOption = (stepIndex: number, optIndex: number) => {
    const steps = [...form.configuration.steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      options: steps[stepIndex].options.filter((_: any, i: number) => i !== optIndex),
    };
    update('configuration.steps', steps);
  };
  const updateConfigOption = (stepIndex: number, optIndex: number, field: string, value: string) => {
    const steps = [...form.configuration.steps];
    const opts = [...steps[stepIndex].options];
    opts[optIndex] = { ...opts[optIndex], [field]: value };
    steps[stepIndex] = { ...steps[stepIndex], options: opts };
    update('configuration.steps', steps);
  };

  // --- Sub-product helpers ---
  const addSubProduct = useCallback((product: any) => {
    const already = form.configuration.subProducts.some((sp: any) => sp.productId === product.id);
    if (already) return;
    const subProducts = [...form.configuration.subProducts, {
      productId: product.id,
      name: product.name,
      sku: product.sku || '',
      price: product.pricing?.basePrice != null ? (product.pricing.basePrice / 100).toFixed(2) : '0.00',
      quantity: 1,
      required: false,
    }];
    update('configuration.subProducts', subProducts);
    setProductSearch('');
    setProductSearchFocused(null);
  }, [form.configuration.subProducts]);

  const removeSubProduct = (index: number) => {
    update('configuration.subProducts', form.configuration.subProducts.filter((_: any, i: number) => i !== index));
  };

  const updateSubProduct = (index: number, field: string, value: unknown) => {
    const next = [...form.configuration.subProducts];
    next[index] = { ...next[index], [field]: value };
    update('configuration.subProducts', next);
  };

  // Add a product to a product_select step
  const addProductToStep = useCallback((stepIndex: number, product: any) => {
    const steps = [...form.configuration.steps];
    const step = steps[stepIndex];
    const already = step.options.some((o: any) => o.productId === product.id);
    if (already) return;
    steps[stepIndex] = {
      ...step,
      options: [...step.options, {
        optionId: '',
        productId: product.id,
        label: product.name,
        priceModifier: product.pricing?.basePrice != null ? (product.pricing.basePrice / 100).toFixed(2) : '0.00',
        sku_fragment: product.sku || '',
      }],
    };
    update('configuration.steps', steps);
    setProductSearch('');
    setProductSearchFocused(null);
  }, [form.configuration.steps]);

  const flatCategories = flattenTree(categoryTree || []);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* Product Type Selector */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Product Type</h2>
        <div className="grid grid-cols-5 gap-2">
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update('type', t.value)}
              className={clsx(
                'rounded-lg border-2 p-3 text-left transition-colors',
                form.type === t.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <p className="text-xs font-semibold text-gray-900">{t.label}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Basic Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Premium T-Shirt"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. TSHIRT-001"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="auto-generated from name if empty"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Short Description</label>
            <input
              type="text"
              value={form.shortDescription}
              onChange={(e) => update('shortDescription', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Brief summary for product listings"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Pricing</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={form.pricing.basePrice}
                  onChange={(e) => update('pricing.basePrice', e.target.value)}
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sale Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pricing.salePrice}
                  onChange={(e) => update('pricing.salePrice', e.target.value)}
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={form.pricing.currency}
                onChange={(e) => update('pricing.currency', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pricing Model</label>
              <select
                value={form.pricing.pricingModel}
                onChange={(e) => update('pricing.pricingModel', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {PRICING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {form.pricing.pricingModel === 'recurring' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Billing Interval</label>
                <select
                  value={form.pricing.recurringInterval}
                  onChange={(e) => update('pricing.recurringInterval', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tax Category</label>
              <select
                value={form.pricing.taxCategory}
                onChange={(e) => update('pricing.taxCategory', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {TAX_CATEGORIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          {form.pricing.salePrice && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sale Start</label>
                <input
                  type="datetime-local"
                  value={form.pricing.salePriceStart}
                  onChange={(e) => update('pricing.salePriceStart', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sale End</label>
                <input
                  type="datetime-local"
                  value={form.pricing.salePriceEnd}
                  onChange={(e) => update('pricing.salePriceEnd', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping — Physical only */}
      {form.type === 'physical' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Shipping</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.shipping.requiresShipping}
                onChange={(e) => update('shipping.requiresShipping', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Requires Shipping
            </label>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={form.shipping.weight.value}
                    onChange={(e) => update('shipping.weight.value', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={form.shipping.weight.unit}
                    onChange={(e) => update('shipping.weight.unit', e.target.value)}
                    className="w-16 rounded-md border border-gray-300 px-1 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
                <input
                  type="number"
                  min="0"
                  value={form.shipping.dimensions.length}
                  onChange={(e) => update('shipping.dimensions.length', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                <input
                  type="number"
                  min="0"
                  value={form.shipping.dimensions.width}
                  onChange={(e) => update('shipping.dimensions.width', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                <input
                  type="number"
                  min="0"
                  value={form.shipping.dimensions.height}
                  onChange={(e) => update('shipping.dimensions.height', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Class</label>
                <input
                  type="text"
                  value={form.shipping.shippingClass}
                  onChange={(e) => update('shipping.shippingClass', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Origin Warehouse</label>
                <input
                  type="text"
                  value={form.shipping.originWarehouse}
                  onChange={(e) => update('shipping.originWarehouse', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.shipping.freeShippingEligible}
                    onChange={(e) => update('shipping.freeShippingEligible', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Free Shipping
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital — Virtual only */}
      {form.type === 'virtual' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Digital Delivery</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Method</label>
              <select
                value={form.digital.deliveryMethod}
                onChange={(e) => update('digital.deliveryMethod', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {DELIVERY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {form.digital.deliveryMethod === 'external_url' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Access URL</label>
                <input
                  type="url"
                  value={form.digital.accessUrl}
                  onChange={(e) => update('digital.accessUrl', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service */}
      {form.type === 'service' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Service Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  value={form.service.serviceType}
                  onChange={(e) => update('service.serviceType', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation Policy</label>
                <select
                  value={form.service.cancellationPolicy}
                  onChange={(e) => update('service.cancellationPolicy', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {CANCELLATION_POLICIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {/* Appointment-specific fields */}
            {form.service.serviceType === 'appointment' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.service.durationMinutes}
                    onChange={(e) => update('service.durationMinutes', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Capacity Per Slot</label>
                  <input
                    type="number"
                    min="1"
                    value={form.service.capacityPerSlot}
                    onChange={(e) => update('service.capacityPerSlot', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Booking Lead Time (hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.service.bookingLeadTimeHours}
                    onChange={(e) => update('service.bookingLeadTimeHours', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Subscription-specific fields */}
            {form.service.serviceType === 'subscription' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Billing Interval</label>
                  <select
                    value={form.service.billingInterval}
                    onChange={(e) => update('service.billingInterval', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Trial Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.service.trialPeriodDays}
                    onChange={(e) => update('service.trialPeriodDays', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">0 = no trial period</p>
                </div>
              </div>
            )}

            {/* Project-specific fields */}
            {form.service.serviceType === 'project' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={form.service.estimatedHours}
                    onChange={(e) => update('service.estimatedHours', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">Approximate hours to complete the project. 0 = variable / TBD.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deliverables</label>
                  <textarea
                    value={form.service.deliverables}
                    onChange={(e) => update('service.deliverables', e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Describe what will be delivered (e.g., wireframes, final design files, source code)..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course */}
      {form.type === 'course' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Course Link</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Course *</label>
              {coursesData?.data?.length ? (
                <>
                  <select
                    value={form.course.courseId}
                    onChange={(e) => update('course.courseId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Choose a course...</option>
                    {coursesData.data.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}{c.status ? ` (${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                  {form.course.courseId && (
                    <p className="mt-1 text-[10px] font-mono text-gray-400">ID: {form.course.courseId}</p>
                  )}
                </>
              ) : (
                <div className={`rounded-md border p-3 ${coursesError ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  {coursesError ? (
                    <p className="text-xs text-red-600">
                      Failed to load courses: {(coursesError as Error).message}.{' '}
                      Ensure the course service is running.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No courses available.{' '}
                      <a href="/courses" className="text-blue-500 hover:underline">Create a course</a> in the Learning section first.
                    </p>
                  )}
                  <input
                    type="text"
                    value={form.course.courseId}
                    onChange={(e) => update('course.courseId', e.target.value)}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                    placeholder="Or paste a Course ID manually"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Access Duration (days, 0 = lifetime)</label>
                <input
                  type="number"
                  min="0"
                  value={form.course.accessDuration}
                  onChange={(e) => update('course.accessDuration', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.course.autoEnroll}
                    onChange={(e) => update('course.autoEnroll', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-enroll on purchase
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Attributes — for products that support variants (not configurable) */}
      {form.type !== 'configurable' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Variant Attributes</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Define attributes like Color, Size, Material to generate product variants.
              </p>
            </div>
            <button
              type="button"
              onClick={addVariantAttr}
              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
            >
              + Add Attribute
            </button>
          </div>
          {form.variantAttrs.length > 0 ? (
            <div className="space-y-3">
              {form.variantAttrs.map((attr: any, i: number) => (
                <div key={i} className="rounded-md border border-gray-200 p-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Attribute Name</label>
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => updateVariantAttr(i, 'name', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. Color"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Slug</label>
                      <input
                        type="text"
                        value={attr.slug}
                        onChange={(e) => updateVariantAttr(i, 'slug', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="color"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Values (comma-separated)</label>
                      <input
                        type="text"
                        value={attr.values}
                        onChange={(e) => updateVariantAttr(i, 'values', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Red, Blue, Green"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Display</label>
                      <select
                        value={attr.displayType}
                        onChange={(e) => updateVariantAttr(i, 'displayType', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {DISPLAY_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeVariantAttr(i)}
                        className="mb-1 rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove attribute"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {attr.values && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {attr.values.split(',').map((v: string, vi: number) => v.trim()).filter(Boolean).map((v: string, vi: number) => (
                        <span key={vi} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-gray-400">
                After saving, go to the Variants tab to auto-generate or manually add variant combinations.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-2">
              No variant attributes defined. Add attributes if this product comes in different options (e.g. sizes, colors).
            </p>
          )}
        </div>
      )}

      {/* Configuration — Configurable only */}
      {form.type === 'configurable' && (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Product Configuration</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Define the steps customers go through to configure this product.
            </p>
          </div>

          {/* Config settings */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SKU Pattern</label>
              <input
                type="text"
                value={form.configuration.skuPattern}
                onChange={(e) => update('configuration.skuPattern', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="{base}-{color}-{size}"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Use {'{'}attribute{'}'} placeholders for dynamic SKU generation
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pricing Strategy</label>
              <select
                value={form.configuration.pricingStrategy}
                onChange={(e) => update('configuration.pricingStrategy', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {PRICING_STRATEGIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Resolved Product Type</label>
              <select
                value={form.configuration.resolvedProductType}
                onChange={(e) => update('configuration.resolvedProductType', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="physical">Physical</option>
                <option value="virtual">Virtual</option>
                <option value="service">Service</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-400">
                The product type after configuration is complete
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {form.configuration.steps.map((step: any, si: number) => (
              <div key={si} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-700">Step {si + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeConfigStep(si)}
                    className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove step"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={step.label}
                      onChange={(e) => updateConfigStep(si, 'label', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Choose Color"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Selection Type</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateConfigStep(si, 'type', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {STEP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.required}
                        onChange={(e) => updateConfigStep(si, 'required', e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Required
                    </label>
                    {step.type === 'multi_select' && (
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-medium text-gray-500 whitespace-nowrap">Max Selections</label>
                        <input
                          type="number"
                          min={0}
                          value={step.maxSelections || 0}
                          onChange={(e) => updateConfigStep(si, 'maxSelections', parseInt(e.target.value) || 0)}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-xs text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          title="0 = unlimited"
                        />
                        <span className="text-[10px] text-gray-400">0 = no limit</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options / Products within this step */}
                {step.type === 'product_select' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Products</label>
                    {/* Product search for this step */}
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearchFocused === `step-${si}` ? productSearch : ''}
                        onChange={(e) => { setProductSearch(e.target.value); setProductSearchFocused(`step-${si}`); }}
                        onFocus={() => setProductSearchFocused(`step-${si}`)}
                        onBlur={() => setTimeout(() => setProductSearchFocused(null), 200)}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Search products to add..."
                      />
                      {productSearchFocused === `step-${si}` && productSearch.length >= 2 && searchableProducts.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                          {searchableProducts
                            .filter((p) => p.id !== initialData?.id && !step.options.some((o: any) => o.productId === p.id))
                            .map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => addProductToStep(si, p)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50 transition-colors"
                              >
                                <span className="flex-1 truncate font-medium text-gray-900">{p.name}</span>
                                {p.sku && <span className="text-gray-400 font-mono">{p.sku}</span>}
                                {p.pricing?.basePrice != null && (
                                  <span className="text-gray-500 font-mono">${(p.pricing.basePrice / 100).toFixed(2)}</span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Listed products */}
                    {step.options.length > 0 ? (
                      <div className="space-y-1">
                        {step.options.map((opt: any, oi: number) => (
                          <div key={oi} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2.5 py-1.5">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-gray-900 truncate">{opt.label}</span>
                              {opt.sku_fragment && (
                                <span className="ml-2 text-[10px] text-gray-400 font-mono">{opt.sku_fragment}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-mono">${opt.priceModifier}</span>
                            <button
                              type="button"
                              onClick={() => removeConfigOption(si, oi)}
                              className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 py-1">No products added. Search above to link existing products.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Options</label>
                      <button
                        type="button"
                        onClick={() => addConfigOption(si)}
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        + Add Option
                      </button>
                    </div>
                    {step.options.length > 0 ? (
                      <div className="space-y-1.5">
                        {step.options.map((opt: any, oi: number) => (
                          <div key={oi} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => updateConfigOption(si, oi, 'label', e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                placeholder="Option label"
                              />
                            </div>
                            <div className="col-span-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={opt.priceModifier}
                                  onChange={(e) => updateConfigOption(si, oi, 'priceModifier', e.target.value)}
                                  className="w-full rounded border border-gray-300 pl-5 pr-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={opt.sku_fragment}
                                onChange={(e) => updateConfigOption(si, oi, 'sku_fragment', e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-mono focus:border-blue-500 focus:outline-none"
                                placeholder="SKU fragment"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeConfigOption(si, oi)}
                                className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="grid grid-cols-12 gap-2 text-[9px] text-gray-400">
                          <div className="col-span-4">Label</div>
                          <div className="col-span-3">Price modifier</div>
                          <div className="col-span-4">SKU fragment</div>
                          <div className="col-span-1" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 py-1">No options yet. Add options for this step.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addConfigStep}
              className="rounded-md border-2 border-dashed border-gray-300 px-4 py-3 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-600 w-full"
            >
              + Add Configuration Step
            </button>
          </div>

          {/* Sub-Products */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-700">Sub-Products</h3>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Link existing products as components of this configurable product. Hidden products are also available.
              </p>
            </div>

            {/* Search input */}
            <div className="relative mb-3">
              <input
                type="text"
                value={productSearchFocused === 'sub' ? productSearch : ''}
                onChange={(e) => { setProductSearch(e.target.value); setProductSearchFocused('sub'); }}
                onFocus={() => setProductSearchFocused('sub')}
                onBlur={() => setTimeout(() => setProductSearchFocused(null), 200)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search products by name or SKU..."
              />
              {productSearchFocused === 'sub' && productSearch.length >= 2 && searchableProducts.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {searchableProducts
                    .filter((p) => p.id !== initialData?.id && !form.configuration.subProducts.some((sp: any) => sp.productId === p.id))
                    .map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addSubProduct(p)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{p.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {p.sku && <span className="font-mono">{p.sku}</span>}
                            {p.sku && p.type && <span className="mx-1">&middot;</span>}
                            {p.type && <span className="capitalize">{p.type}</span>}
                          </div>
                        </div>
                        {p.pricing?.basePrice != null && (
                          <span className="text-xs text-gray-500 font-mono">
                            ${(p.pricing.basePrice / 100).toFixed(2)}
                          </span>
                        )}
                      </button>
                    ))}
                  {searchableProducts.filter((p) => p.id !== initialData?.id && !form.configuration.subProducts.some((sp: any) => sp.productId === p.id)).length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">All matching products already added</p>
                  )}
                </div>
              )}
              {productSearchFocused === 'sub' && productSearch.length >= 2 && searchableProducts.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg px-3 py-2">
                  <p className="text-xs text-gray-400">No products found</p>
                </div>
              )}
            </div>

            {/* Sub-product list */}
            {form.configuration.subProducts.length > 0 ? (
              <div className="space-y-2">
                {form.configuration.subProducts.map((sp: any, spi: number) => (
                  <div key={sp.productId} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{sp.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {sp.sku && <span className="font-mono">{sp.sku}</span>}
                        {sp.sku && <span className="mx-1">&middot;</span>}
                        <span className="font-mono">${sp.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] text-gray-500">
                        <input
                          type="checkbox"
                          checked={sp.required}
                          onChange={(e) => updateSubProduct(spi, 'required', e.target.checked)}
                          className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Required
                      </label>
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-gray-500">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={sp.quantity}
                          onChange={(e) => updateSubProduct(spi, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-12 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-center focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSubProduct(spi)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove sub-product"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-1">
                No sub-products linked. Search above to add existing products.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Images */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Images</h2>
        <div className="space-y-3">
          {form.images.map((img: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded-md border border-gray-200 p-3">
              <div className="flex-1 space-y-2">
                <MediaPicker
                  label={i === 0 ? 'Primary Image' : `Image ${i + 1}`}
                  value={img.url}
                  onChange={(url) => updateImage(i, 'url', url)}
                  accept="image/*"
                />
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => updateImage(i, 'alt', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  placeholder="Alt text"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="mt-1 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addImage}
            className="rounded-md border-2 border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-600 w-full"
          >
            + Add Image
          </button>
        </div>
      </div>

      {/* Categories & Tags */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Organization</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Categories</label>
            {flatCategories.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                {flatCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.categories.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          update('categories', [...form.categories, cat.id]);
                        } else {
                          update('categories', form.categories.filter((id: string) => id !== cat.id));
                        }
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span style={{ paddingLeft: `${cat.depth * 12}px` }}>{cat.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No categories yet.{' '}
                <a href="/categories" className="text-blue-500 hover:underline">Create categories</a> first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.tags.map((tag: string) => {
                const tagObj = productTags.find((t) => t.slug === tag || t.name === tag);
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: tagObj?.color ? `${tagObj.color}20` : '#f3f4f6',
                      color: tagObj?.color || '#4b5563',
                    }}
                  >
                    {tagObj?.color && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagObj.color }} />
                    )}
                    {tagObj?.name || tag}
                    <button
                      type="button"
                      onClick={() => update('tags', form.tags.filter((t: string) => t !== tag))}
                      className="opacity-60 hover:opacity-100"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
            {productTags.length > 0 ? (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !form.tags.includes(e.target.value)) {
                    update('tags', [...form.tags, e.target.value]);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">Add a tag...</option>
                {productTags
                  .filter((t) => !form.tags.includes(t.slug) && !form.tags.includes(t.name))
                  .map((t) => (
                    <option key={t.id} value={t.slug}>{t.name}</option>
                  ))}
              </select>
            ) : (
              <p className="text-xs text-gray-400">
                No product tags configured.{' '}
                <a href="/product-tags" className="text-blue-500 hover:underline">Create tags</a> to organize your products.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">SEO Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SEO Title</label>
            <input
              type="text"
              value={form.seoTitle}
              onChange={(e) => update('seoTitle', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Product page title for search engines"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">{form.seoTitle.length}/60 characters</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SEO Description</label>
            <textarea
              value={form.seoDescription}
              onChange={(e) => update('seoDescription', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Meta description for this product page"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">{form.seoDescription.length}/160 characters</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Keywords</label>
            <input
              type="text"
              value={form.seoKeywords}
              onChange={(e) => update('seoKeywords', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Comma-separated keywords"
            />
          </div>
          <div>
            <MediaPicker
              label="OG Image"
              value={form.seoOgImage}
              onChange={(v) => update('seoOgImage', v)}
              accept="image/*"
              helpText="Image displayed when shared on social media (recommended 1200x630)"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <a
          href="/products"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
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
