'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '@/lib/api-client';

// ── Types ──

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  methods: ShippingMethod[];
}

interface ShippingMethod {
  id: string;
  name: string;
  type: 'flat_rate' | 'free' | 'weight_based' | 'price_based' | 'carrier_calculated';
  enabled: boolean;
  cost: string;
  minOrderAmount: string;
  weightRanges: WeightRange[];
  priceRanges: PriceRange[];
  estimatedDays: string;
  carrierId: string;       // which carrier for carrier_calculated
  carrierServices: string[]; // which services to offer
  carrierMarkupType: 'none' | 'flat' | 'percent';
  carrierMarkupValue: string;
}

interface WeightRange {
  minWeight: string;
  maxWeight: string;
  cost: string;
}

interface PriceRange {
  minPrice: string;
  maxPrice: string;
  cost: string;
}

interface CarrierConfig {
  id: string;
  name: string;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  accountNumber: string;
  apiKey: string;
  apiSecret: string;
  meterNumber: string;    // UPS-specific
  siteId: string;         // DHL-specific
  password: string;       // DHL-specific
  enabledServices: string[];
  defaultPackaging: string;
  negotiatedRates: boolean;
  insuranceEnabled: boolean;
  signatureRequired: 'none' | 'adult' | 'direct' | 'indirect';
}

interface HandlingFeeTier {
  id: string;
  label: string;
  minWeight: string;
  maxWeight: string;
  minDimTotal: string;  // L+W+H combined
  maxDimTotal: string;
  flatFee: string;
  percentFee: string;   // % of shipping cost
}

interface ShippingSettings {
  enabled: boolean;
  originAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  weightUnit: 'lb' | 'kg' | 'oz' | 'g';
  dimensionUnit: 'in' | 'cm';
  freeShippingThreshold: string;
  freeShippingEnabled: boolean;
  zones: ShippingZone[];
  fallbackRate: string;
  // Handling fees — enhanced
  handlingFee: string;   // legacy flat fee (kept for backward compat)
  handlingFeeMode: 'none' | 'flat' | 'per_item' | 'weight_tiered' | 'size_tiered' | 'percent';
  handlingFlatFee: string;
  handlingPerItemFee: string;
  handlingPercentFee: string;
  handlingTiers: HandlingFeeTier[];
  // Carriers
  carriers: CarrierConfig[];
  digitalProductsSkipShipping: boolean;
  // Rate test
  packagePresets: PackagePreset[];
}

interface PackagePreset {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  maxWeight: string;
}

// ── Constants ──

const DEFAULT_CARRIERS: CarrierConfig[] = [
  {
    id: 'ups',
    name: 'UPS',
    enabled: false,
    environment: 'sandbox',
    accountNumber: '',
    apiKey: '',
    apiSecret: '',
    meterNumber: '',
    siteId: '',
    password: '',
    enabledServices: [],
    defaultPackaging: 'YOUR_PACKAGING',
    negotiatedRates: false,
    insuranceEnabled: false,
    signatureRequired: 'none',
  },
  {
    id: 'fedex',
    name: 'FedEx',
    enabled: false,
    environment: 'sandbox',
    accountNumber: '',
    apiKey: '',
    apiSecret: '',
    meterNumber: '',
    siteId: '',
    password: '',
    enabledServices: [],
    defaultPackaging: 'YOUR_PACKAGING',
    negotiatedRates: false,
    insuranceEnabled: false,
    signatureRequired: 'none',
  },
  {
    id: 'usps',
    name: 'USPS',
    enabled: false,
    environment: 'sandbox',
    accountNumber: '',
    apiKey: '',
    apiSecret: '',
    meterNumber: '',
    siteId: '',
    password: '',
    enabledServices: [],
    defaultPackaging: 'YOUR_PACKAGING',
    negotiatedRates: false,
    insuranceEnabled: false,
    signatureRequired: 'none',
  },
  {
    id: 'dhl',
    name: 'DHL Express',
    enabled: false,
    environment: 'sandbox',
    accountNumber: '',
    apiKey: '',
    apiSecret: '',
    meterNumber: '',
    siteId: '',
    password: '',
    enabledServices: [],
    defaultPackaging: 'YOUR_PACKAGING',
    negotiatedRates: false,
    insuranceEnabled: false,
    signatureRequired: 'none',
  },
];

const CARRIER_SERVICES: Record<string, { value: string; label: string }[]> = {
  ups: [
    { value: 'ups_ground', label: 'UPS Ground' },
    { value: 'ups_3_day_select', label: 'UPS 3 Day Select' },
    { value: 'ups_2nd_day_air', label: 'UPS 2nd Day Air' },
    { value: 'ups_2nd_day_air_am', label: 'UPS 2nd Day Air AM' },
    { value: 'ups_next_day_air_saver', label: 'UPS Next Day Air Saver' },
    { value: 'ups_next_day_air', label: 'UPS Next Day Air' },
    { value: 'ups_next_day_air_early', label: 'UPS Next Day Air Early' },
    { value: 'ups_standard_international', label: 'UPS Standard (International)' },
    { value: 'ups_worldwide_expedited', label: 'UPS Worldwide Expedited' },
    { value: 'ups_worldwide_express', label: 'UPS Worldwide Express' },
    { value: 'ups_worldwide_saver', label: 'UPS Worldwide Saver' },
    { value: 'ups_surepost', label: 'UPS SurePost' },
  ],
  fedex: [
    { value: 'fedex_ground', label: 'FedEx Ground' },
    { value: 'fedex_home_delivery', label: 'FedEx Home Delivery' },
    { value: 'fedex_express_saver', label: 'FedEx Express Saver' },
    { value: 'fedex_2day', label: 'FedEx 2Day' },
    { value: 'fedex_2day_am', label: 'FedEx 2Day AM' },
    { value: 'fedex_standard_overnight', label: 'FedEx Standard Overnight' },
    { value: 'fedex_priority_overnight', label: 'FedEx Priority Overnight' },
    { value: 'fedex_first_overnight', label: 'FedEx First Overnight' },
    { value: 'fedex_ground_economy', label: 'FedEx Ground Economy (SmartPost)' },
    { value: 'fedex_international_economy', label: 'FedEx International Economy' },
    { value: 'fedex_international_priority', label: 'FedEx International Priority' },
    { value: 'fedex_freight', label: 'FedEx Freight' },
  ],
  usps: [
    { value: 'usps_priority_mail', label: 'Priority Mail' },
    { value: 'usps_priority_mail_express', label: 'Priority Mail Express' },
    { value: 'usps_ground_advantage', label: 'USPS Ground Advantage' },
    { value: 'usps_first_class_mail', label: 'First-Class Mail' },
    { value: 'usps_media_mail', label: 'Media Mail' },
    { value: 'usps_parcel_select', label: 'Parcel Select' },
    { value: 'usps_priority_mail_intl', label: 'Priority Mail International' },
    { value: 'usps_priority_mail_express_intl', label: 'Priority Mail Express International' },
    { value: 'usps_first_class_mail_intl', label: 'First-Class Mail International' },
  ],
  dhl: [
    { value: 'dhl_express_worldwide', label: 'DHL Express Worldwide' },
    { value: 'dhl_express_1200', label: 'DHL Express 12:00' },
    { value: 'dhl_express_900', label: 'DHL Express 9:00' },
    { value: 'dhl_economy_select', label: 'DHL Economy Select' },
    { value: 'dhl_express_envelope', label: 'DHL Express Envelope' },
    { value: 'dhl_freight', label: 'DHL Freight' },
    { value: 'dhl_ecommerce', label: 'DHL eCommerce' },
    { value: 'dhl_parcel_international_direct', label: 'DHL Parcel International Direct' },
  ],
};

const CARRIER_PACKAGING: Record<string, { value: string; label: string }[]> = {
  ups: [
    { value: 'YOUR_PACKAGING', label: 'Your Packaging' },
    { value: 'UPS_LETTER', label: 'UPS Letter' },
    { value: 'UPS_TUBE', label: 'UPS Tube' },
    { value: 'UPS_PAK', label: 'UPS Pak' },
    { value: 'UPS_EXPRESS_BOX_SMALL', label: 'UPS Express Box (Small)' },
    { value: 'UPS_EXPRESS_BOX_MEDIUM', label: 'UPS Express Box (Medium)' },
    { value: 'UPS_EXPRESS_BOX_LARGE', label: 'UPS Express Box (Large)' },
    { value: 'UPS_25KG_BOX', label: 'UPS 25 KG Box' },
    { value: 'UPS_10KG_BOX', label: 'UPS 10 KG Box' },
  ],
  fedex: [
    { value: 'YOUR_PACKAGING', label: 'Your Packaging' },
    { value: 'FEDEX_ENVELOPE', label: 'FedEx Envelope' },
    { value: 'FEDEX_PAK', label: 'FedEx Pak' },
    { value: 'FEDEX_BOX_SMALL', label: 'FedEx Small Box' },
    { value: 'FEDEX_BOX_MEDIUM', label: 'FedEx Medium Box' },
    { value: 'FEDEX_BOX_LARGE', label: 'FedEx Large Box' },
    { value: 'FEDEX_TUBE', label: 'FedEx Tube' },
    { value: 'FEDEX_10KG_BOX', label: 'FedEx 10kg Box' },
    { value: 'FEDEX_25KG_BOX', label: 'FedEx 25kg Box' },
  ],
  usps: [
    { value: 'YOUR_PACKAGING', label: 'Your Packaging' },
    { value: 'FLAT_RATE_ENVELOPE', label: 'Flat Rate Envelope' },
    { value: 'FLAT_RATE_PADDED_ENVELOPE', label: 'Flat Rate Padded Envelope' },
    { value: 'FLAT_RATE_BOX_SMALL', label: 'Small Flat Rate Box' },
    { value: 'FLAT_RATE_BOX_MEDIUM', label: 'Medium Flat Rate Box' },
    { value: 'FLAT_RATE_BOX_LARGE', label: 'Large Flat Rate Box' },
    { value: 'REGIONAL_RATE_BOX_A', label: 'Regional Rate Box A' },
    { value: 'REGIONAL_RATE_BOX_B', label: 'Regional Rate Box B' },
  ],
  dhl: [
    { value: 'YOUR_PACKAGING', label: 'Your Packaging' },
    { value: 'DHL_FLYER', label: 'DHL Flyer' },
    { value: 'DHL_BOX_2', label: 'DHL Box 2' },
    { value: 'DHL_BOX_3', label: 'DHL Box 3' },
    { value: 'DHL_BOX_4', label: 'DHL Box 4' },
    { value: 'DHL_BOX_5', label: 'DHL Box 5' },
    { value: 'DHL_EXPRESS_ENVELOPE', label: 'DHL Express Envelope' },
  ],
};

const CARRIER_LOGOS: Record<string, { color: string; bg: string }> = {
  ups: { color: '#4A1E00', bg: '#FFD100' },
  fedex: { color: '#4D148C', bg: '#FF6200' },
  usps: { color: '#004B87', bg: '#D22630' },
  dhl: { color: '#D40511', bg: '#FFCC00' },
};

const DEFAULT_SHIPPING: ShippingSettings = {
  enabled: true,
  originAddress: { line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US' },
  weightUnit: 'lb',
  dimensionUnit: 'in',
  freeShippingThreshold: '',
  freeShippingEnabled: false,
  zones: [],
  fallbackRate: '9.99',
  handlingFee: '',
  handlingFeeMode: 'none',
  handlingFlatFee: '',
  handlingPerItemFee: '',
  handlingPercentFee: '',
  handlingTiers: [],
  carriers: DEFAULT_CARRIERS,
  digitalProductsSkipShipping: true,
  packagePresets: [],
};

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'MX', label: 'Mexico' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'AU', label: 'Australia' },
  { code: 'JP', label: 'Japan' },
  { code: 'BR', label: 'Brazil' },
  { code: 'IN', label: 'India' },
  { code: 'CN', label: 'China' },
  { code: 'KR', label: 'South Korea' },
  { code: 'IT', label: 'Italy' },
  { code: 'ES', label: 'Spain' },
  { code: 'NL', label: 'Netherlands' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const METHOD_TYPES = [
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'free', label: 'Free Shipping' },
  { value: 'weight_based', label: 'Weight-Based' },
  { value: 'price_based', label: 'Price-Based' },
  { value: 'carrier_calculated', label: 'Carrier Calculated (Live Rates)' },
];

const HANDLING_FEE_MODES = [
  { value: 'none', label: 'No handling fee' },
  { value: 'flat', label: 'Flat fee per order' },
  { value: 'per_item', label: 'Flat fee per item' },
  { value: 'percent', label: 'Percentage of shipping cost' },
  { value: 'weight_tiered', label: 'Tiered by product weight' },
  { value: 'size_tiered', label: 'Tiered by package dimensions' },
];

// ── Helpers ──

function genId() {
  return `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createMethod(): ShippingMethod {
  return {
    id: genId(),
    name: 'Standard Shipping',
    type: 'flat_rate',
    enabled: true,
    cost: '9.99',
    minOrderAmount: '',
    weightRanges: [],
    priceRanges: [],
    estimatedDays: '5-7',
    carrierId: '',
    carrierServices: [],
    carrierMarkupType: 'none',
    carrierMarkupValue: '',
  };
}

function createTier(): HandlingFeeTier {
  return {
    id: genId(),
    label: '',
    minWeight: '',
    maxWeight: '',
    minDimTotal: '',
    maxDimTotal: '',
    flatFee: '',
    percentFee: '',
  };
}

// ── Component ──

export default function ShippingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'shipping'],
    queryFn: () => settingsApi.get('shipping'),
  });

  const [form, setForm] = useState<ShippingSettings>(DEFAULT_SHIPPING);
  const [dirty, setDirty] = useState(false);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'carriers' | 'handling' | 'zones' | 'test'>('general');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Rate test state
  const [testForm, setTestForm] = useState({
    destPostalCode: '',
    destCountry: 'US',
    destState: '',
    weight: '',
    length: '',
    width: '',
    height: '',
  });
  const [testResults, setTestResults] = useState<{ carrier: string; service: string; rate: string; days: string }[] | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULT_SHIPPING,
        ...settings,
        originAddress: { ...DEFAULT_SHIPPING.originAddress, ...settings.originAddress },
        carriers: mergeCarriers(settings.carriers),
        handlingTiers: settings.handlingTiers || [],
        packagePresets: settings.packagePresets || [],
      });
      setDirty(false);
    }
  }, [settings]);

  // Merge saved carriers with defaults so new carriers are always present
  function mergeCarriers(saved?: CarrierConfig[]): CarrierConfig[] {
    if (!saved) return DEFAULT_CARRIERS;
    return DEFAULT_CARRIERS.map((def) => {
      const existing = saved.find((c) => c.id === def.id);
      return existing ? { ...def, ...existing } : def;
    });
  }

  const mutation = useMutation({
    mutationFn: (data: ShippingSettings) => settingsApi.update('shipping', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Shipping settings saved');
      setDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateOrigin = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      originAddress: { ...prev.originAddress, [key]: value },
    }));
    setDirty(true);
  };

  const updateCarrier = (carrierId: string, updates: Partial<CarrierConfig>) => {
    setForm((prev) => ({
      ...prev,
      carriers: prev.carriers.map((c) => c.id === carrierId ? { ...c, ...updates } : c),
    }));
    setDirty(true);
  };

  const toggleCarrierService = (carrierId: string, serviceValue: string) => {
    const carrier = form.carriers.find((c) => c.id === carrierId);
    if (!carrier) return;
    const services = carrier.enabledServices.includes(serviceValue)
      ? carrier.enabledServices.filter((s) => s !== serviceValue)
      : [...carrier.enabledServices, serviceValue];
    updateCarrier(carrierId, { enabledServices: services });
  };

  // Zones
  const addZone = () => {
    const zone: ShippingZone = { id: genId(), name: 'New Zone', countries: ['US'], methods: [createMethod()] };
    setForm((prev) => ({ ...prev, zones: [...prev.zones, zone] }));
    setExpandedZone(zone.id);
    setDirty(true);
  };

  const removeZone = (zoneId: string) => {
    setForm((prev) => ({ ...prev, zones: prev.zones.filter((z) => z.id !== zoneId) }));
    setDirty(true);
  };

  const updateZone = (zoneId: string, updates: Partial<ShippingZone>) => {
    setForm((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => z.id === zoneId ? { ...z, ...updates } : z),
    }));
    setDirty(true);
  };

  const addMethod = (zoneId: string) => {
    const zone = form.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    updateZone(zoneId, { methods: [...zone.methods, createMethod()] });
  };

  const removeMethod = (zoneId: string, methodId: string) => {
    const zone = form.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    updateZone(zoneId, { methods: zone.methods.filter((m) => m.id !== methodId) });
  };

  const updateMethod = (zoneId: string, methodId: string, updates: Partial<ShippingMethod>) => {
    const zone = form.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    updateZone(zoneId, {
      methods: zone.methods.map((m) => m.id === methodId ? { ...m, ...updates } : m),
    });
  };

  const toggleCountry = (zoneId: string, code: string) => {
    const zone = form.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const countries = zone.countries.includes(code)
      ? zone.countries.filter((c) => c !== code)
      : [...zone.countries, code];
    updateZone(zoneId, { countries });
  };

  // Handling tiers
  const addTier = () => {
    setForm((prev) => ({ ...prev, handlingTiers: [...prev.handlingTiers, createTier()] }));
    setDirty(true);
  };

  const removeTier = (tierId: string) => {
    setForm((prev) => ({ ...prev, handlingTiers: prev.handlingTiers.filter((t) => t.id !== tierId) }));
    setDirty(true);
  };

  const updateTier = (tierId: string, updates: Partial<HandlingFeeTier>) => {
    setForm((prev) => ({
      ...prev,
      handlingTiers: prev.handlingTiers.map((t) => t.id === tierId ? { ...t, ...updates } : t),
    }));
    setDirty(true);
  };

  // Rate test
  const runRateTest = () => {
    setTestRunning(true);
    setTestResults(null);

    // Simulate carrier rate quotes based on enabled carriers and weight/dimensions
    setTimeout(() => {
      const results: { carrier: string; service: string; rate: string; days: string }[] = [];
      const weight = parseFloat(testForm.weight) || 1;
      const dimWeight = ((parseFloat(testForm.length) || 1) * (parseFloat(testForm.width) || 1) * (parseFloat(testForm.height) || 1)) / (form.dimensionUnit === 'in' ? 139 : 5000);
      const billableWeight = Math.max(weight, dimWeight);
      const isDomestic = testForm.destCountry === form.originAddress.country;

      for (const carrier of form.carriers) {
        if (!carrier.enabled) continue;
        const services = CARRIER_SERVICES[carrier.id] || [];
        for (const svc of services) {
          if (carrier.enabledServices.length > 0 && !carrier.enabledServices.includes(svc.value)) continue;
          // Generate simulated rate based on carrier, service, and weight
          const baseRate = getSimulatedRate(carrier.id, svc.value, billableWeight, isDomestic);
          if (baseRate === null) continue;
          const days = getSimulatedDays(carrier.id, svc.value, isDomestic);
          results.push({
            carrier: carrier.name,
            service: svc.label,
            rate: `$${baseRate.toFixed(2)}`,
            days,
          });
        }
      }

      // Sort by rate
      results.sort((a, b) => parseFloat(a.rate.slice(1)) - parseFloat(b.rate.slice(1)));
      setTestResults(results);
      setTestRunning(false);
    }, 1500);
  };

  const enabledCarrierCount = form.carriers.filter((c) => c.enabled).length;
  const enabledServiceCount = form.carriers.reduce((sum, c) => sum + (c.enabled ? c.enabledServices.length : 0), 0);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const TAB_ITEMS = [
    { key: 'general', label: 'General', count: null },
    { key: 'carriers', label: 'Carriers', count: enabledCarrierCount || null },
    { key: 'handling', label: 'Handling Fees', count: null },
    { key: 'zones', label: 'Zones', count: form.zones.length || null },
    { key: 'test', label: 'Rate Calculator', count: null },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure carriers, zones, handling fees, and shipping rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!dirty || mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeSection === tab.key
                ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-semibold text-gray-600">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-3xl space-y-6">
        {/* ═══════ GENERAL TAB ═══════ */}
        {activeSection === 'general' && (
          <>
            {/* Enable + Units */}
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Shipping Enabled</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Toggle shipping for the entire store</p>
                </div>
                <button
                  onClick={() => update('enabled', !form.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  role="switch"
                  aria-checked={form.enabled}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Weight Unit</label>
                  <select value={form.weightUnit} onChange={(e) => update('weightUnit', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="lb">Pounds (lb)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="g">Grams (g)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dimension Unit</label>
                  <select value={form.dimensionUnit} onChange={(e) => update('dimensionUnit', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="in">Inches (in)</option>
                    <option value="cm">Centimeters (cm)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.digitalProductsSkipShipping}
                    onChange={(e) => update('digitalProductsSkipShipping', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5" />
                  Digital products and courses skip shipping calculation
                </label>
              </div>
            </div>

            {/* Ship-From Address */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Ship-From Address</h2>
              <p className="mb-3 text-xs text-gray-500">Used for carrier rate calculations, labels, and return address</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
                  <input type="text" value={form.originAddress.line1} onChange={(e) => updateOrigin('line1', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="123 Warehouse Dr" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
                  <input type="text" value={form.originAddress.line2} onChange={(e) => updateOrigin('line2', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Suite 100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input type="text" value={form.originAddress.city} onChange={(e) => updateOrigin('city', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <select value={form.originAddress.state} onChange={(e) => updateOrigin('state', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">Select state</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
                  <input type="text" value={form.originAddress.postalCode} onChange={(e) => updateOrigin('postalCode', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="10001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                  <select value={form.originAddress.country} onChange={(e) => updateOrigin('country', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Free Shipping + Fallback */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Global Shipping Rules</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={form.freeShippingEnabled}
                    onChange={(e) => update('freeShippingEnabled', e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700">Free shipping over threshold</label>
                    {form.freeShippingEnabled && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-500">$</span>
                        <input type="text" value={form.freeShippingThreshold}
                          onChange={(e) => update('freeShippingThreshold', e.target.value)}
                          className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="50.00" />
                        <span className="text-xs text-gray-400">minimum order amount</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fallback Flat Rate</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input type="text" value={form.fallbackRate} onChange={(e) => update('fallbackRate', e.target.value)}
                      className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="9.99" />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Used when no zone matches the shipping address and no carrier rates are available</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ CARRIERS TAB ═══════ */}
        {activeSection === 'carriers' && (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Shipping Carrier Integrations</h2>
              <p className="mb-4 text-xs text-gray-500">
                Connect to carrier APIs for live rate calculations based on product weight, dimensions, and destination.
                Rates are pulled at checkout to give customers accurate shipping costs.
              </p>

              {/* Carrier status summary */}
              <div className="mb-4 flex flex-wrap gap-3">
                {form.carriers.map((carrier) => {
                  const colors = CARRIER_LOGOS[carrier.id];
                  return (
                    <div key={carrier.id}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        carrier.enabled
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                      onClick={() => setExpandedCarrier(expandedCarrier === carrier.id ? null : carrier.id)}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold"
                        style={{ backgroundColor: colors?.bg, color: colors?.color }}>
                        {carrier.id.slice(0, 2).toUpperCase()}
                      </span>
                      {carrier.name}
                      {carrier.enabled && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                      )}
                      {carrier.enabled && carrier.enabledServices.length > 0 && (
                        <span className="text-[10px] text-green-600">
                          {carrier.enabledServices.length} services
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual carrier configs */}
            {form.carriers.map((carrier) => {
              const isExpanded = expandedCarrier === carrier.id;
              const services = CARRIER_SERVICES[carrier.id] || [];
              const packaging = CARRIER_PACKAGING[carrier.id] || [];
              const colors = CARRIER_LOGOS[carrier.id];

              return (
                <div key={carrier.id} className="rounded-lg bg-white shadow overflow-hidden">
                  {/* Carrier header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedCarrier(isExpanded ? null : carrier.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                        style={{ backgroundColor: colors?.bg, color: colors?.color }}>
                        {carrier.id === 'ups' ? 'UPS' : carrier.id === 'fedex' ? 'FX' : carrier.id === 'usps' ? 'US' : 'DHL'}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{carrier.name}</h3>
                        <p className="text-[10px] text-gray-400">
                          {carrier.enabled ? `${carrier.environment} mode` : 'Not configured'}
                          {carrier.enabled && carrier.accountNumber && ` \u2022 Account: ${carrier.accountNumber.slice(0, 4)}...`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCarrier(carrier.id, { enabled: !carrier.enabled }); }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${carrier.enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                        role="switch"
                        aria-checked={carrier.enabled}
                      >
                        <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform ${carrier.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>

                  {/* Carrier details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 py-5 space-y-5">
                      {/* Environment */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Environment</label>
                        <div className="flex gap-2">
                          {(['sandbox', 'production'] as const).map((env) => (
                            <button key={env} type="button"
                              onClick={() => updateCarrier(carrier.id, { environment: env })}
                              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                                carrier.environment === env
                                  ? env === 'production' ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}>
                              {env === 'sandbox' ? 'Sandbox / Testing' : 'Production / Live'}
                            </button>
                          ))}
                        </div>
                        {carrier.environment === 'production' && (
                          <p className="mt-1.5 text-[10px] text-red-500 font-medium">
                            Live mode — real charges will apply to rate lookups and label generation
                          </p>
                        )}
                      </div>

                      {/* API Credentials */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-3">API Credentials</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                              {carrier.id === 'ups' ? 'Client ID' : carrier.id === 'dhl' ? 'Site ID' : 'API Key'}
                            </label>
                            <input type="text"
                              value={carrier.apiKey}
                              onChange={(e) => updateCarrier(carrier.id, { apiKey: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={carrier.id === 'ups' ? 'UPS Client ID' : carrier.id === 'dhl' ? 'DHL Site ID' : `${carrier.name} API Key`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">
                              {carrier.id === 'ups' ? 'Client Secret' : carrier.id === 'dhl' ? 'Password' : 'API Secret'}
                            </label>
                            <div className="relative">
                              <input
                                type={showSecrets[carrier.id] ? 'text' : 'password'}
                                value={carrier.apiSecret}
                                onChange={(e) => updateCarrier(carrier.id, { apiSecret: e.target.value })}
                                className="w-full rounded-md border border-gray-300 px-3 py-1.5 pr-8 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                              />
                              <button type="button"
                                onClick={() => setShowSecrets((prev) => ({ ...prev, [carrier.id]: !prev[carrier.id] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600">
                                {showSecrets[carrier.id] ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Account Number</label>
                            <input type="text"
                              value={carrier.accountNumber}
                              onChange={(e) => updateCarrier(carrier.id, { accountNumber: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder={`${carrier.name} account number`}
                            />
                          </div>
                          {carrier.id === 'ups' && (
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-1">Meter Number</label>
                              <input type="text"
                                value={carrier.meterNumber}
                                onChange={(e) => updateCarrier(carrier.id, { meterNumber: e.target.value })}
                                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="UPS Meter Number"
                              />
                            </div>
                          )}
                          {carrier.id === 'dhl' && (
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-1">DHL Password</label>
                              <input type="password"
                                value={carrier.password}
                                onChange={(e) => updateCarrier(carrier.id, { password: e.target.value })}
                                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="DHL account password"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shipping Options */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Default Packaging</label>
                          <select
                            value={carrier.defaultPackaging}
                            onChange={(e) => updateCarrier(carrier.id, { defaultPackaging: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                            {packaging.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Signature Requirement</label>
                          <select
                            value={carrier.signatureRequired}
                            onChange={(e) => updateCarrier(carrier.id, { signatureRequired: e.target.value as CarrierConfig['signatureRequired'] })}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none">
                            <option value="none">None</option>
                            <option value="indirect">Indirect (any available person)</option>
                            <option value="direct">Direct (named recipient)</option>
                            <option value="adult">Adult Signature Required</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={carrier.negotiatedRates}
                            onChange={(e) => updateCarrier(carrier.id, { negotiatedRates: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5" />
                          Use negotiated/account rates
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={carrier.insuranceEnabled}
                            onChange={(e) => updateCarrier(carrier.id, { insuranceEnabled: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5" />
                          Include shipping insurance
                        </label>
                      </div>

                      {/* Service Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700">
                            Enabled Services
                            <span className="ml-1 text-[10px] font-normal text-gray-400">
                              ({carrier.enabledServices.length === 0 ? 'all available' : `${carrier.enabledServices.length} selected`})
                            </span>
                          </h4>
                          {carrier.enabledServices.length > 0 && (
                            <button type="button"
                              onClick={() => updateCarrier(carrier.id, { enabledServices: [] })}
                              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">
                              Reset to all
                            </button>
                          )}
                        </div>
                        <p className="mb-2 text-[10px] text-gray-400">
                          Leave all unchecked to offer every available service, or select specific services to show at checkout
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2">
                          {services.map((svc) => (
                            <label key={svc.value} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer py-1 px-1 rounded hover:bg-gray-50">
                              <input type="checkbox"
                                checked={carrier.enabledServices.includes(svc.value)}
                                onChange={() => toggleCarrierService(carrier.id, svc.value)}
                                className="rounded border-gray-300 text-blue-600 h-3 w-3" />
                              {svc.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ═══════ HANDLING FEES TAB ═══════ */}
        {activeSection === 'handling' && (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Handling Fees</h2>
              <p className="mb-4 text-xs text-gray-500">
                Add handling charges on top of shipping costs to cover packaging materials, labor, and preparation.
                Fees are calculated per order unless configured as per-item.
              </p>

              {/* Mode selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Handling Fee Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {HANDLING_FEE_MODES.map((mode) => (
                    <button key={mode.value} type="button"
                      onClick={() => update('handlingFeeMode', mode.value)}
                      className={`rounded-md border-2 px-3 py-2 text-left text-xs transition-colors ${
                        form.handlingFeeMode === mode.value
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flat fee */}
              {form.handlingFeeMode === 'flat' && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Flat Handling Fee (per order)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input type="text" value={form.handlingFlatFee}
                      onChange={(e) => update('handlingFlatFee', e.target.value)}
                      className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="2.50" />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">This fixed amount is added to every order&apos;s shipping total</p>
                </div>
              )}

              {/* Per-item fee */}
              {form.handlingFeeMode === 'per_item' && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Handling Fee Per Item</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input type="text" value={form.handlingPerItemFee}
                      onChange={(e) => update('handlingPerItemFee', e.target.value)}
                      className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="1.00" />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">Multiplied by the number of physical items in the cart</p>
                </div>
              )}

              {/* Percent of shipping */}
              {form.handlingFeeMode === 'percent' && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Handling Fee Percentage</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={form.handlingPercentFee}
                      onChange={(e) => update('handlingPercentFee', e.target.value)}
                      className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="10" />
                    <span className="text-sm text-gray-500">%</span>
                    <span className="text-xs text-gray-400">of calculated shipping cost</span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Example: If shipping is $12.00 and handling is 10%, total shipping charge = $13.20
                  </p>
                </div>
              )}

              {/* Weight-tiered */}
              {form.handlingFeeMode === 'weight_tiered' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Set handling fees based on the total order weight. Each tier defines a weight range and the handling fee applied.
                  </p>
                  {form.handlingTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="flex-1 grid grid-cols-5 gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Label</label>
                          <input type="text" value={tier.label}
                            onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="e.g. Small" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Min Weight ({form.weightUnit})</label>
                          <input type="text" value={tier.minWeight}
                            onChange={(e) => updateTier(tier.id, { minWeight: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Max Weight ({form.weightUnit})</label>
                          <input type="text" value={tier.maxWeight}
                            onChange={(e) => updateTier(tier.id, { maxWeight: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="5" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Flat Fee ($)</label>
                          <input type="text" value={tier.flatFee}
                            onChange={(e) => updateTier(tier.id, { flatFee: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="2.00" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Or % of Ship</label>
                          <input type="text" value={tier.percentFee}
                            onChange={(e) => updateTier(tier.id, { percentFee: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="0" />
                        </div>
                      </div>
                      <button onClick={() => removeTier(tier.id)}
                        className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 mt-4">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addTier}
                    className="w-full rounded-md border-2 border-dashed border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-600">
                    + Add Weight Tier
                  </button>
                  <div className="rounded-md bg-blue-50 p-3">
                    <p className="text-[10px] text-blue-700">
                      <strong>How it works:</strong> The total order weight is compared against each tier.
                      The matching tier&apos;s flat fee (or % of shipping cost) is added to the order.
                      If both flat fee and percentage are set, the flat fee takes priority.
                      If no tier matches, no handling fee is charged.
                    </p>
                  </div>
                </div>
              )}

              {/* Size-tiered */}
              {form.handlingFeeMode === 'size_tiered' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Set handling fees based on combined package dimensions (L+W+H). Useful for oversized item surcharges.
                  </p>
                  {form.handlingTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="flex-1 grid grid-cols-5 gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Label</label>
                          <input type="text" value={tier.label}
                            onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="e.g. Oversized" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Min L+W+H ({form.dimensionUnit})</label>
                          <input type="text" value={tier.minDimTotal}
                            onChange={(e) => updateTier(tier.id, { minDimTotal: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Max L+W+H ({form.dimensionUnit})</label>
                          <input type="text" value={tier.maxDimTotal}
                            onChange={(e) => updateTier(tier.id, { maxDimTotal: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="36" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Flat Fee ($)</label>
                          <input type="text" value={tier.flatFee}
                            onChange={(e) => updateTier(tier.id, { flatFee: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="5.00" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Or % of Ship</label>
                          <input type="text" value={tier.percentFee}
                            onChange={(e) => updateTier(tier.id, { percentFee: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                            placeholder="0" />
                        </div>
                      </div>
                      <button onClick={() => removeTier(tier.id)}
                        className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 mt-4">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addTier}
                    className="w-full rounded-md border-2 border-dashed border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-600">
                    + Add Size Tier
                  </button>
                  <div className="rounded-md bg-blue-50 p-3">
                    <p className="text-[10px] text-blue-700">
                      <strong>How it works:</strong> The largest item&apos;s combined dimensions (L+W+H) determine
                      which tier applies. This is ideal for adding surcharges for oversized or bulky items.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Handling fee examples */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">How Handling Fees Are Applied</h3>
              <div className="space-y-2 text-[11px] text-gray-500">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded bg-gray-100 text-center text-[10px] font-bold text-gray-500">1</span>
                  <span>Carrier calculates base shipping rate from product weight, dimensions, and destination</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded bg-gray-100 text-center text-[10px] font-bold text-gray-500">2</span>
                  <span>Handling fee is calculated based on your selected mode (flat, per-item, %, or tiered)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded bg-gray-100 text-center text-[10px] font-bold text-gray-500">3</span>
                  <span>Final shipping cost = carrier rate + handling fee (displayed as one &quot;Shipping&quot; line at checkout)</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ ZONES TAB ═══════ */}
        {activeSection === 'zones' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Shipping Zones</h2>
                <p className="mt-0.5 text-xs text-gray-500">Define geographic zones with specific shipping methods and rates</p>
              </div>
              <button onClick={addZone} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                Add Zone
              </button>
            </div>

            {form.zones.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-sm text-gray-400">No shipping zones configured</p>
                <p className="mt-1 text-xs text-gray-400">The fallback flat rate will be used for all orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {form.zones.map((zone) => {
                  const isExpanded = expandedZone === zone.id;
                  return (
                    <div key={zone.id} className="rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedZone(isExpanded ? null : zone.id)}>
                        <div className="flex items-center gap-3">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <span className="text-sm font-medium text-gray-800">{zone.name}</span>
                          <span className="text-xs text-gray-400">
                            {zone.countries.length} countries, {zone.methods.length} methods
                          </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeZone(zone.id); }}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Zone Name</label>
                            <input type="text" value={zone.name} onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Countries in this zone</label>
                            <div className="flex flex-wrap gap-1.5">
                              {COUNTRIES.map((c) => (
                                <button key={c.code} type="button" onClick={() => toggleCountry(zone.id, c.code)}
                                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                    zone.countries.includes(c.code)
                                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                  }`}>
                                  {c.code}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-[10px] font-medium text-gray-500">Shipping Methods</label>
                              <button onClick={() => addMethod(zone.id)} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">
                                + Add Method
                              </button>
                            </div>
                            <div className="space-y-2">
                              {zone.methods.map((method) => (
                                <div key={method.id} className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={method.enabled}
                                        onChange={(e) => updateMethod(zone.id, method.id, { enabled: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5" />
                                      <input type="text" value={method.name}
                                        onChange={(e) => updateMethod(zone.id, method.id, { name: e.target.value })}
                                        className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-800 w-40 focus:border-blue-400 focus:outline-none" />
                                    </div>
                                    <button onClick={() => removeMethod(zone.id, method.id)}
                                      className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-gray-400 mb-0.5">Type</label>
                                      <select value={method.type}
                                        onChange={(e) => updateMethod(zone.id, method.id, { type: e.target.value as ShippingMethod['type'] })}
                                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none">
                                        {METHOD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                      </select>
                                    </div>
                                    {method.type === 'flat_rate' && (
                                      <div>
                                        <label className="block text-[10px] text-gray-400 mb-0.5">Cost ($)</label>
                                        <input type="text" value={method.cost}
                                          onChange={(e) => updateMethod(zone.id, method.id, { cost: e.target.value })}
                                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none" placeholder="9.99" />
                                      </div>
                                    )}
                                    {method.type === 'free' && (
                                      <div>
                                        <label className="block text-[10px] text-gray-400 mb-0.5">Min Order ($)</label>
                                        <input type="text" value={method.minOrderAmount}
                                          onChange={(e) => updateMethod(zone.id, method.id, { minOrderAmount: e.target.value })}
                                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none" placeholder="0 = always free" />
                                      </div>
                                    )}
                                    {method.type !== 'carrier_calculated' && (
                                      <div>
                                        <label className="block text-[10px] text-gray-400 mb-0.5">Est. Days</label>
                                        <input type="text" value={method.estimatedDays}
                                          onChange={(e) => updateMethod(zone.id, method.id, { estimatedDays: e.target.value })}
                                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none" placeholder="5-7" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Carrier-calculated specific fields */}
                                  {method.type === 'carrier_calculated' && (
                                    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-3 space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] text-blue-700 font-medium mb-0.5">Carrier</label>
                                          <select value={method.carrierId}
                                            onChange={(e) => updateMethod(zone.id, method.id, { carrierId: e.target.value, carrierServices: [] })}
                                            className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none">
                                            <option value="">All enabled carriers</option>
                                            {form.carriers.filter((c) => c.enabled).map((c) => (
                                              <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-blue-700 font-medium mb-0.5">Rate Markup</label>
                                          <div className="flex gap-1">
                                            <select value={method.carrierMarkupType}
                                              onChange={(e) => updateMethod(zone.id, method.id, { carrierMarkupType: e.target.value as ShippingMethod['carrierMarkupType'] })}
                                              className="rounded border border-blue-200 bg-white px-1 py-1 text-xs focus:border-blue-400 focus:outline-none">
                                              <option value="none">None</option>
                                              <option value="flat">+ Flat $</option>
                                              <option value="percent">+ Percent %</option>
                                            </select>
                                            {method.carrierMarkupType !== 'none' && (
                                              <input type="text" value={method.carrierMarkupValue}
                                                onChange={(e) => updateMethod(zone.id, method.id, { carrierMarkupValue: e.target.value })}
                                                className="w-16 rounded border border-blue-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                                placeholder={method.carrierMarkupType === 'flat' ? '2.00' : '10'} />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Service filter for the selected carrier */}
                                      {method.carrierId && (
                                        <div>
                                          <label className="block text-[10px] text-blue-700 font-medium mb-1">Limit to services (optional)</label>
                                          <div className="flex flex-wrap gap-1">
                                            {(CARRIER_SERVICES[method.carrierId] || []).map((svc) => (
                                              <button key={svc.value} type="button"
                                                onClick={() => {
                                                  const services = method.carrierServices.includes(svc.value)
                                                    ? method.carrierServices.filter((s) => s !== svc.value)
                                                    : [...method.carrierServices, svc.value];
                                                  updateMethod(zone.id, method.id, { carrierServices: services });
                                                }}
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                                                  method.carrierServices.includes(svc.value)
                                                    ? 'bg-blue-200 text-blue-800'
                                                    : 'bg-blue-100/50 text-blue-600 hover:bg-blue-100'
                                                }`}>
                                                {svc.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <p className="text-[10px] text-blue-600">
                                        Live rates will be fetched from {method.carrierId ? form.carriers.find((c) => c.id === method.carrierId)?.name : 'all enabled carriers'} at checkout based on cart contents and destination
                                      </p>
                                    </div>
                                  )}

                                  {/* Weight-based ranges */}
                                  {method.type === 'weight_based' && (
                                    <div className="mt-2 space-y-1.5">
                                      <label className="block text-[10px] text-gray-400">Weight Ranges</label>
                                      {method.weightRanges.map((wr, wi) => (
                                        <div key={wi} className="grid grid-cols-4 gap-1.5">
                                          <input type="text" value={wr.minWeight}
                                            onChange={(e) => {
                                              const ranges = [...method.weightRanges];
                                              ranges[wi] = { ...(ranges[wi] ?? { minWeight: '', maxWeight: '', cost: '' }), minWeight: e.target.value };
                                              updateMethod(zone.id, method.id, { weightRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder={`Min ${form.weightUnit}`} />
                                          <input type="text" value={wr.maxWeight}
                                            onChange={(e) => {
                                              const ranges = [...method.weightRanges];
                                              ranges[wi] = { ...(ranges[wi] ?? { minWeight: '', maxWeight: '', cost: '' }), maxWeight: e.target.value };
                                              updateMethod(zone.id, method.id, { weightRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder={`Max ${form.weightUnit}`} />
                                          <input type="text" value={wr.cost}
                                            onChange={(e) => {
                                              const ranges = [...method.weightRanges];
                                              ranges[wi] = { ...(ranges[wi] ?? { minWeight: '', maxWeight: '', cost: '' }), cost: e.target.value };
                                              updateMethod(zone.id, method.id, { weightRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder="Cost $" />
                                          <button onClick={() => {
                                            updateMethod(zone.id, method.id, { weightRanges: method.weightRanges.filter((_, i) => i !== wi) });
                                          }} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                      ))}
                                      <button type="button" onClick={() => {
                                        updateMethod(zone.id, method.id, { weightRanges: [...method.weightRanges, { minWeight: '', maxWeight: '', cost: '' }] });
                                      }} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">+ Add Range</button>
                                    </div>
                                  )}

                                  {/* Price-based ranges */}
                                  {method.type === 'price_based' && (
                                    <div className="mt-2 space-y-1.5">
                                      <label className="block text-[10px] text-gray-400">Price Ranges</label>
                                      {method.priceRanges.map((pr, pi) => (
                                        <div key={pi} className="grid grid-cols-4 gap-1.5">
                                          <input type="text" value={pr.minPrice}
                                            onChange={(e) => {
                                              const ranges = [...method.priceRanges];
                                              ranges[pi] = { ...(ranges[pi] ?? { minPrice: '', maxPrice: '', cost: '' }), minPrice: e.target.value };
                                              updateMethod(zone.id, method.id, { priceRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder="Min $" />
                                          <input type="text" value={pr.maxPrice}
                                            onChange={(e) => {
                                              const ranges = [...method.priceRanges];
                                              ranges[pi] = { ...(ranges[pi] ?? { minPrice: '', maxPrice: '', cost: '' }), maxPrice: e.target.value };
                                              updateMethod(zone.id, method.id, { priceRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder="Max $" />
                                          <input type="text" value={pr.cost}
                                            onChange={(e) => {
                                              const ranges = [...method.priceRanges];
                                              ranges[pi] = { ...(ranges[pi] ?? { minPrice: '', maxPrice: '', cost: '' }), cost: e.target.value };
                                              updateMethod(zone.id, method.id, { priceRanges: ranges });
                                            }}
                                            className="rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                            placeholder="Ship cost $" />
                                          <button onClick={() => {
                                            updateMethod(zone.id, method.id, { priceRanges: method.priceRanges.filter((_, i) => i !== pi) });
                                          }} className="text-[10px] text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                      ))}
                                      <button type="button" onClick={() => {
                                        updateMethod(zone.id, method.id, { priceRanges: [...method.priceRanges, { minPrice: '', maxPrice: '', cost: '' }] });
                                      }} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">+ Add Range</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════ RATE CALCULATOR TAB ═══════ */}
        {activeSection === 'test' && (
          <>
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Shipping Rate Calculator</h2>
              <p className="mb-4 text-xs text-gray-500">
                Test shipping rate calculations by entering package details and a destination.
                This will query all enabled carriers and show estimated rates.
              </p>

              {enabledCarrierCount === 0 && (
                <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-700">
                    No carriers are enabled. Enable at least one carrier in the Carriers tab to get live rate quotes.
                    The calculator will still show zone-based rates.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* From (read-only) */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Ship From</p>
                  {form.originAddress.line1 ? (
                    <div className="text-xs text-gray-700">
                      <p>{form.originAddress.line1}</p>
                      {form.originAddress.line2 && <p>{form.originAddress.line2}</p>}
                      <p>{form.originAddress.city}, {form.originAddress.state} {form.originAddress.postalCode}</p>
                      <p>{COUNTRIES.find((c) => c.code === form.originAddress.country)?.label || form.originAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No origin address configured — set it in the General tab</p>
                  )}
                </div>

                {/* To (editable) */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Ship To</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={testForm.destPostalCode}
                        onChange={(e) => setTestForm({ ...testForm, destPostalCode: e.target.value })}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                        placeholder="Postal code" />
                      <select value={testForm.destCountry}
                        onChange={(e) => setTestForm({ ...testForm, destCountry: e.target.value })}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none">
                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>
                    {testForm.destCountry === 'US' && (
                      <select value={testForm.destState}
                        onChange={(e) => setTestForm({ ...testForm, destState: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none">
                        <option value="">State (optional)</option>
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Package details */}
              <div className="mt-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Package Details</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Weight ({form.weightUnit})</label>
                    <input type="number" min="0" step="0.1" value={testForm.weight}
                      onChange={(e) => setTestForm({ ...testForm, weight: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="5.0" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Length ({form.dimensionUnit})</label>
                    <input type="number" min="0" value={testForm.length}
                      onChange={(e) => setTestForm({ ...testForm, length: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="12" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Width ({form.dimensionUnit})</label>
                    <input type="number" min="0" value={testForm.width}
                      onChange={(e) => setTestForm({ ...testForm, width: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="8" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Height ({form.dimensionUnit})</label>
                    <input type="number" min="0" value={testForm.height}
                      onChange={(e) => setTestForm({ ...testForm, height: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="6" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button type="button" onClick={runRateTest}
                  disabled={!testForm.destPostalCode || !testForm.weight || testRunning}
                  className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {testRunning ? 'Calculating Rates...' : 'Calculate Rates'}
                </button>
              </div>
            </div>

            {/* Test results */}
            {testResults !== null && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Rate Results
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {testResults.length} {testResults.length === 1 ? 'option' : 'options'} found
                  </span>
                </h3>
                {testResults.length === 0 ? (
                  <div className="rounded-md bg-amber-50 p-4 text-center">
                    <p className="text-xs text-amber-700">No rates returned. Check that carriers are enabled with valid credentials and the destination is in a covered service area.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Carrier</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Service</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Rate</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Est. Transit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {testResults.map((r, i) => (
                          <tr key={i} className={i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-2 font-medium text-gray-800">
                              {r.carrier}
                              {i === 0 && <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-[9px] font-semibold text-green-700">Cheapest</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{r.service}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{r.rate}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{r.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {form.handlingFeeMode !== 'none' && (
                  <p className="mt-2 text-[10px] text-gray-400">
                    Note: Handling fees will be added on top of these carrier rates at checkout.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Simulated rate calculations (placeholder for real carrier API integration) ──

function getSimulatedRate(carrierId: string, serviceId: string, billableWeight: number, isDomestic: boolean): number | null {
  const base: Record<string, number> = {
    // UPS
    ups_ground: 7.50,
    ups_3_day_select: 12.00,
    ups_2nd_day_air: 18.50,
    ups_2nd_day_air_am: 22.00,
    ups_next_day_air_saver: 28.00,
    ups_next_day_air: 35.00,
    ups_next_day_air_early: 55.00,
    ups_standard_international: 25.00,
    ups_worldwide_expedited: 45.00,
    ups_worldwide_express: 65.00,
    ups_worldwide_saver: 55.00,
    ups_surepost: 5.50,
    // FedEx
    fedex_ground: 7.00,
    fedex_home_delivery: 8.50,
    fedex_express_saver: 13.00,
    fedex_2day: 17.00,
    fedex_2day_am: 20.00,
    fedex_standard_overnight: 26.00,
    fedex_priority_overnight: 33.00,
    fedex_first_overnight: 52.00,
    fedex_ground_economy: 5.00,
    fedex_international_economy: 35.00,
    fedex_international_priority: 55.00,
    fedex_freight: 85.00,
    // USPS
    usps_priority_mail: 8.00,
    usps_priority_mail_express: 26.00,
    usps_ground_advantage: 5.50,
    usps_first_class_mail: 4.00,
    usps_media_mail: 3.50,
    usps_parcel_select: 7.50,
    usps_priority_mail_intl: 40.00,
    usps_priority_mail_express_intl: 55.00,
    usps_first_class_mail_intl: 15.00,
    // DHL
    dhl_express_worldwide: 50.00,
    dhl_express_1200: 65.00,
    dhl_express_900: 80.00,
    dhl_economy_select: 30.00,
    dhl_express_envelope: 35.00,
    dhl_freight: 100.00,
    dhl_ecommerce: 12.00,
    dhl_parcel_international_direct: 18.00,
  };

  const baseRate = base[serviceId];
  if (baseRate == null) return null;

  // Filter domestic/international
  const intlServices = [
    'ups_standard_international', 'ups_worldwide_expedited', 'ups_worldwide_express', 'ups_worldwide_saver',
    'fedex_international_economy', 'fedex_international_priority',
    'usps_priority_mail_intl', 'usps_priority_mail_express_intl', 'usps_first_class_mail_intl',
    'dhl_express_worldwide', 'dhl_express_1200', 'dhl_express_900', 'dhl_economy_select',
    'dhl_express_envelope', 'dhl_freight', 'dhl_ecommerce', 'dhl_parcel_international_direct',
  ];

  const isIntl = intlServices.includes(serviceId);
  if (isDomestic && isIntl) return null;
  if (!isDomestic && !isIntl) return null;

  // Weight surcharge: add $1.50 per lb over 1lb
  const weightSurcharge = Math.max(0, billableWeight - 1) * 1.5;

  // Add some randomness to simulate real-world variance
  const variance = 0.9 + Math.random() * 0.2;

  return Math.round((baseRate + weightSurcharge) * variance * 100) / 100;
}

function getSimulatedDays(carrierId: string, serviceId: string, isDomestic: boolean): string {
  const days: Record<string, string> = {
    ups_ground: '3-5 days',
    ups_3_day_select: '3 days',
    ups_2nd_day_air: '2 days',
    ups_2nd_day_air_am: '2 days (AM)',
    ups_next_day_air_saver: '1 day',
    ups_next_day_air: '1 day',
    ups_next_day_air_early: '1 day (early AM)',
    ups_standard_international: '6-10 days',
    ups_worldwide_expedited: '3-5 days',
    ups_worldwide_express: '1-3 days',
    ups_worldwide_saver: '2-5 days',
    ups_surepost: '5-8 days',
    fedex_ground: '3-5 days',
    fedex_home_delivery: '3-5 days',
    fedex_express_saver: '3 days',
    fedex_2day: '2 days',
    fedex_2day_am: '2 days (AM)',
    fedex_standard_overnight: '1 day',
    fedex_priority_overnight: '1 day (AM)',
    fedex_first_overnight: '1 day (8 AM)',
    fedex_ground_economy: '5-8 days',
    fedex_international_economy: '5-7 days',
    fedex_international_priority: '1-3 days',
    fedex_freight: '3-7 days',
    usps_priority_mail: '1-3 days',
    usps_priority_mail_express: '1-2 days',
    usps_ground_advantage: '2-5 days',
    usps_first_class_mail: '3-5 days',
    usps_media_mail: '5-8 days',
    usps_parcel_select: '3-7 days',
    usps_priority_mail_intl: '6-10 days',
    usps_priority_mail_express_intl: '3-5 days',
    usps_first_class_mail_intl: '7-21 days',
    dhl_express_worldwide: '2-5 days',
    dhl_express_1200: '1-3 days',
    dhl_express_900: '1-2 days',
    dhl_economy_select: '5-10 days',
    dhl_express_envelope: '2-4 days',
    dhl_freight: '5-10 days',
    dhl_ecommerce: '5-10 days',
    dhl_parcel_international_direct: '7-14 days',
  };
  return days[serviceId] || '3-7 days';
}
