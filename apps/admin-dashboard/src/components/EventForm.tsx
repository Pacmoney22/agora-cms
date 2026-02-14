'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi, productsApi, settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import Link from 'next/link';

// ── Types ──

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  saleStart: string;
  saleEnd: string;
  seatingType: 'open' | 'reserved';
  seatMapSection: string;
  visibility: 'visible' | 'hidden' | 'password';
  password: string;
  earlyBirdPrice: number;
  earlyBirdEnd: string;
  groupDiscount: number;
  groupMinSize: number;
}

interface ProductAddon {
  productId: string;
  productName: string;
  required: boolean;
  maxQuantity: number;
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  endType: 'date' | 'count' | 'never';
  endDate: string;
  endCount: number;
  daysOfWeek: number[];
}

interface SponsorTier {
  id: string;
  name: string;
  color: string;
  price: number;
  maxSponsors: number;
  order: number;
  benefits: string[]; // benefit names included in this tier
}

interface BoothReservation {
  reserved: boolean;
  boothId: string;
  size: 'small' | 'medium' | 'large' | 'custom';
  customWidth: number;
  customDepth: number;
  location: string;
  power: boolean;
  wifi: boolean;
  tables: number;
  chairs: number;
  setupDate: string;
  setupTime: string;
  teardownDate: string;
  teardownTime: string;
  notes: string;
}

interface SponsorDiscount {
  enabled: boolean;
  code: string;
  type: 'percentage' | 'fixed';
  amount: number;
  maxUses: number;
  expiryDate: string;
  applicableTickets: string[]; // ticket type IDs, empty = all
}

interface Sponsor {
  id: string;
  name: string;
  tierId: string;
  logo: string;
  website: string;
  description: string;
  contactName: string;
  contactEmail: string;
  amount: number;
  currency: string;
  benefits: string[]; // benefit names toggled on for this sponsor (inherits from tier, can override)
  booth: BoothReservation;
  discount: SponsorDiscount;
  twitter: string;
  linkedin: string;
  featured: boolean;
  order: number;
}

interface BadgeTemplate {
  width: number;
  height: number;
  unit: 'in' | 'mm';
  orientation: 'portrait' | 'landscape';
  backgroundColor: string;
  backgroundImage: string;
  showLogo: boolean;
  logoPosition: 'top' | 'bottom';
  logoImage: string;
  showName: boolean;
  nameSize: number;
  nameColor: string;
  showEmail: boolean;
  showCompany: boolean;
  showTicketType: boolean;
  showQrCode: boolean;
  showPhoto: boolean;
  customText: string;
  customTextPosition: 'top' | 'bottom';
  borderColor: string;
  borderWidth: number;
}

interface EventFormData {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  image: string;
  type: 'in_person' | 'virtual' | 'hybrid';
  format: 'single' | 'multi_day' | 'conference' | 'recurring';
  status: 'draft' | 'published';

  // Dates
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;

  // Virtual
  virtualPlatform: string;
  virtualUrl: string;
  virtualInstructions: string;

  // Venue
  venueId: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueZip: string;
  venueCountry: string;
  venueRoom: string;
  venueCapacity: number;
  venueNotes: string;
  venueMapImage: string;
  reservedSeating: boolean;
  seatMapImage: string;
  seatSections: SeatSection[];

  // Tickets
  ticketTypes: TicketType[];
  isFreeEvent: boolean;
  productAddons: ProductAddon[];

  // Waitlist
  waitlistEnabled: boolean;
  waitlistCapacity: number;
  waitlistAutoPromote: boolean;

  // Check-in
  checkinEnabled: boolean;
  checkinStart: string;
  checkinQrCodes: boolean;
  checkinSelfService: boolean;

  // Recurrence
  isRecurring: boolean;
  recurrence: RecurrenceRule;

  // Multi-day / Conference
  days: ConferenceDay[];

  // Exhibitor Booths
  exhibitorBoothsEnabled: boolean;
  exhibitorFloorPlanImage: string;
  boothZones: BoothZone[];
  exhibitorBooths: ExhibitorBooth[];
  exhibitorTicketTypes: ExhibitorTicketType[];
  exhibitorAmenityOptions: string[];

  // Sponsors
  sponsorTiers: SponsorTier[];
  sponsorBenefitOptions: string[]; // master list of available benefit names
  sponsors: Sponsor[];
  boothMapImage: string;

  // Badges
  badgeTemplate: BadgeTemplate;

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string;
  seoTwitterCard: 'summary' | 'summary_large_image';
  seoTwitterTitle: string;
  seoTwitterDescription: string;
  seoTwitterImage: string;
  seoFacebookTitle: string;
  seoFacebookDescription: string;
  seoFacebookImage: string;

  // Registration
  registrationFields: RegistrationField[];
  confirmationEmail: string;
  reminderEmail: string;
  reminderHoursBefore: number;

  // Categories / Tags
  category: string;
  tags: string[];
}

interface SeatSection {
  id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  price: number;
  color: string;
}

interface BoothZone {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface ExhibitorBooth {
  id: string;
  boothNumber: string;
  zoneId: string;
  size: 'small' | 'medium' | 'large' | 'premium' | 'custom';
  width: number;  // feet
  depth: number;  // feet
  price: number;
  status: 'available' | 'reserved' | 'sold';
  assignedTo: string; // sponsor name or exhibitor name
  amenities: string[]; // power, wifi, tables, chairs, etc.
  notes: string;
}

interface ExhibitorTicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  includesBoothSize: string; // booth size included with ticket
  saleStart: string;
  saleEnd: string;
  perksIncluded: string[];
}

interface ConferenceDay {
  id: string;
  date: string;
  label: string;
  startTime: string;
  endTime: string;
  sessions: InlineSession[];
}

interface InlineSession {
  id: string;
  title: string;
  type: 'keynote' | 'breakout' | 'workshop' | 'panel' | 'networking' | 'break' | 'other';
  startTime: string;
  endTime: string;
  room: string;
  track: string;
  capacity: number;
  seatingType: 'open' | 'reserved';
  description: string;
  speakers: string;
}

interface RegistrationField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options: string;
}

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

const SECTION_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const BOOTH_SIZES = [
  { value: 'small', label: 'Small (8\' \u00d7 8\')', width: 8, depth: 8 },
  { value: 'medium', label: 'Medium (10\' \u00d7 10\')', width: 10, depth: 10 },
  { value: 'large', label: 'Large (10\' \u00d7 20\')', width: 10, depth: 20 },
  { value: 'premium', label: 'Premium (20\' \u00d7 20\')', width: 20, depth: 20 },
  { value: 'custom', label: 'Custom', width: 0, depth: 0 },
];

const DEFAULT_BOOTH_AMENITIES = [
  'Standard Power (110V)', 'High Power (220V)', 'Wi-Fi', 'Ethernet',
  'Draped Table (6\')', 'Draped Table (8\')', 'Folding Chairs',
  'Wastebasket', 'Carpet', 'Spotlight', 'Monitor/Screen',
  'Lead Retrieval Scanner', 'Badge Scanner',
];

const EMPTY_EXHIBITOR_TICKET: ExhibitorTicketType = {
  id: '', name: '', description: '', price: 0, currency: 'USD',
  quantity: 0, includesBoothSize: 'medium', saleStart: '', saleEnd: '',
  perksIncluded: [],
};

const EXHIBITOR_PERKS = [
  'Booth setup/teardown assistance', 'Exhibitor lounge access', 'Parking pass',
  'Attendee list', 'Lead retrieval app', 'Wi-Fi included',
  'Complimentary event passes (2)', 'Complimentary event passes (4)',
  'Logo in event program', 'Logo on event website', 'Social media mention',
];

const DEFAULT_SPONSOR_TIERS: SponsorTier[] = [
  { id: 'title', name: 'Title Sponsor', color: '#eab308', price: 25000, maxSponsors: 1, order: 0, benefits: ['Logo on all materials', 'Main stage branding', 'Speaking slot', 'Premium booth', 'Complimentary tickets (20)', 'Social media promotion', 'Email feature'] },
  { id: 'platinum', name: 'Platinum', color: '#94a3b8', price: 15000, maxSponsors: 3, order: 1, benefits: ['Logo on all materials', 'Speaking slot', 'Large booth', 'Complimentary tickets (10)', 'Social media promotion', 'Email feature'] },
  { id: 'gold', name: 'Gold', color: '#f59e0b', price: 10000, maxSponsors: 5, order: 2, benefits: ['Logo on website', 'Medium booth', 'Complimentary tickets (5)', 'Social media promotion'] },
  { id: 'silver', name: 'Silver', color: '#9ca3af', price: 5000, maxSponsors: 10, order: 3, benefits: ['Logo on website', 'Small booth', 'Complimentary tickets (2)'] },
  { id: 'bronze', name: 'Bronze', color: '#f97316', price: 2500, maxSponsors: 0, order: 4, benefits: ['Logo on website', 'Complimentary tickets (1)'] },
  { id: 'community', name: 'Community', color: '#3b82f6', price: 0, maxSponsors: 0, order: 5, benefits: ['Logo on website'] },
];

const DEFAULT_BENEFIT_OPTIONS = [
  'Logo on all materials', 'Logo on website', 'Main stage branding', 'Speaking slot',
  'Premium booth', 'Large booth', 'Medium booth', 'Small booth',
  'Complimentary tickets (20)', 'Complimentary tickets (10)', 'Complimentary tickets (5)',
  'Complimentary tickets (2)', 'Complimentary tickets (1)',
  'Social media promotion', 'Email feature', 'Attendee list access',
  'VIP dinner invite', 'Lanyard branding', 'Session naming rights',
  'Swag bag insert', 'On-stage acknowledgment', 'Video ad during breaks',
];

const EMPTY_BOOTH: BoothReservation = {
  reserved: false, boothId: '', size: 'medium', customWidth: 0, customDepth: 0,
  location: '', power: true, wifi: true, tables: 1, chairs: 2,
  setupDate: '', setupTime: '07:00', teardownDate: '', teardownTime: '18:00', notes: '',
};

const EMPTY_DISCOUNT: SponsorDiscount = {
  enabled: false, code: '', type: 'percentage', amount: 0,
  maxUses: 0, expiryDate: '', applicableTickets: [],
};

const EMPTY_SPONSOR: Sponsor = {
  id: '', name: '', tierId: '', logo: '', website: '', description: '',
  contactName: '', contactEmail: '', amount: 0, currency: 'USD',
  benefits: [], booth: { ...EMPTY_BOOTH }, discount: { ...EMPTY_DISCOUNT },
  twitter: '', linkedin: '', featured: false, order: 0,
};

const DEFAULT_BADGE: BadgeTemplate = {
  width: 4, height: 3, unit: 'in', orientation: 'landscape',
  backgroundColor: '#ffffff', backgroundImage: '',
  showLogo: true, logoPosition: 'top', logoImage: '',
  showName: true, nameSize: 24, nameColor: '#111827',
  showEmail: true, showCompany: true, showTicketType: true,
  showQrCode: true, showPhoto: false,
  customText: '', customTextPosition: 'bottom',
  borderColor: '#3b82f6', borderWidth: 2,
};

const BADGE_SIZES = [
  { label: '4" \u00d7 3" (Standard)', width: 4, height: 3 },
  { label: '3.5" \u00d7 2" (Small)', width: 3.5, height: 2 },
  { label: '4" \u00d7 6" (Large)', width: 4, height: 6 },
  { label: 'A6 (105mm \u00d7 148mm)', width: 105, height: 148 },
];

const EMPTY_TICKET: TicketType = {
  id: '', name: '', description: '', price: 0, currency: 'USD', quantity: 100,
  minPerOrder: 1, maxPerOrder: 10, saleStart: '', saleEnd: '',
  seatingType: 'open', seatMapSection: '', visibility: 'visible', password: '',
  earlyBirdPrice: 0, earlyBirdEnd: '', groupDiscount: 0, groupMinSize: 0,
};

const EMPTY_RECURRENCE: RecurrenceRule = {
  frequency: 'weekly', interval: 1, endType: 'count', endDate: '', endCount: 10, daysOfWeek: [],
};

// ── Component ──

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  isPending: boolean;
}

export function EventForm({ initialData, onSubmit, isPending }: EventFormProps) {
  const isEdit = !!initialData?.title;

  const [form, setForm] = useState<EventFormData>({
    title: '', slug: '', description: '', shortDescription: '', image: '',
    type: 'in_person', format: 'single', status: 'draft',
    startDate: '', startTime: '09:00', endDate: '', endTime: '17:00', timezone: 'America/New_York',
    virtualPlatform: '', virtualUrl: '', virtualInstructions: '',
    venueId: '', venueName: '', venueAddress: '', venueCity: '', venueState: '',
    venueZip: '', venueCountry: 'US', venueRoom: '', venueCapacity: 0, venueNotes: '',
    venueMapImage: '', reservedSeating: false, seatMapImage: '', seatSections: [],
    ticketTypes: [], isFreeEvent: false, productAddons: [],
    waitlistEnabled: false, waitlistCapacity: 50, waitlistAutoPromote: true,
    checkinEnabled: true, checkinStart: '', checkinQrCodes: true, checkinSelfService: false,
    isRecurring: false, recurrence: { ...EMPTY_RECURRENCE },
    days: [],
    exhibitorBoothsEnabled: false, exhibitorFloorPlanImage: '',
    boothZones: [], exhibitorBooths: [], exhibitorTicketTypes: [],
    exhibitorAmenityOptions: [...DEFAULT_BOOTH_AMENITIES],
    sponsorTiers: DEFAULT_SPONSOR_TIERS.map((t) => ({ ...t })),
    sponsorBenefitOptions: [...DEFAULT_BENEFIT_OPTIONS],
    sponsors: [],
    boothMapImage: '',
    badgeTemplate: { ...DEFAULT_BADGE },
    seoTitle: '', seoDescription: '', seoKeywords: '', seoOgImage: '',
    seoTwitterCard: 'summary_large_image', seoTwitterTitle: '', seoTwitterDescription: '', seoTwitterImage: '',
    seoFacebookTitle: '', seoFacebookDescription: '', seoFacebookImage: '',
    registrationFields: [], confirmationEmail: '', reminderEmail: '', reminderHoursBefore: 24,
    category: '', tags: [],
    ...initialData,
  });

  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'venue' | 'schedule' | 'exhibitors' | 'sponsors' | 'badges' | 'registration' | 'seo'>('details');

  // Fetch venues for dropdown
  const { data: venuesData } = useQuery({
    queryKey: ['venues'],
    queryFn: () => eventsApi.listVenues({ limit: 100 }),
  });
  const venues = venuesData?.data || [];

  // Fetch products for add-ons
  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 100, status: 'published' }],
    queryFn: () => productsApi.list({ limit: 100, status: 'published' }),
  });
  const products = productsData?.data || [];

  // Fetch event categories
  const { data: eventCategoriesData } = useQuery({
    queryKey: ['settings', 'event_categories'],
    queryFn: () => settingsApi.get('event_categories').catch(() => ({ categories: [] })),
  });
  const eventCategories: { id: string; name: string; slug: string; color: string; parentId: string }[] = (eventCategoriesData as any)?.categories || [];

  // Fetch event tags
  const { data: eventTagsData } = useQuery({
    queryKey: ['settings', 'event_tags'],
    queryFn: () => settingsApi.get('event_tags').catch(() => ({ tags: [] })),
  });
  const eventTags: { id: string; name: string; slug: string; color: string }[] = (eventTagsData as any)?.tags || [];

  const set = (updates: Partial<EventFormData>) => setForm((f) => ({ ...f, ...updates }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      slug: form.slug || autoSlug(form.title),
    });
  };

  // ── Ticket helpers ──
  const addTicketType = () => {
    set({
      ticketTypes: [...form.ticketTypes, { ...EMPTY_TICKET, id: crypto.randomUUID(), name: `Ticket ${form.ticketTypes.length + 1}` }],
    });
  };
  const updateTicket = (id: string, updates: Partial<TicketType>) => {
    set({ ticketTypes: form.ticketTypes.map((t) => t.id === id ? { ...t, ...updates } : t) });
  };
  const removeTicket = (id: string) => {
    set({ ticketTypes: form.ticketTypes.filter((t) => t.id !== id) });
  };

  // ── Seat section helpers ──
  const addSeatSection = () => {
    set({
      seatSections: [...form.seatSections, {
        id: crypto.randomUUID(),
        name: `Section ${String.fromCharCode(65 + form.seatSections.length)}`,
        rows: 10, seatsPerRow: 20, price: 0,
        color: SECTION_COLORS[form.seatSections.length % SECTION_COLORS.length] ?? '#000000',
      }],
    });
  };
  const updateSection = (id: string, updates: Partial<SeatSection>) => {
    set({ seatSections: form.seatSections.map((s) => s.id === id ? { ...s, ...updates } : s) });
  };
  const removeSection = (id: string) => {
    set({ seatSections: form.seatSections.filter((s) => s.id !== id) });
  };

  // ── Product addon helpers ──
  const addProductAddon = () => {
    const unused = products.filter((p: any) => !form.productAddons.some((a) => a.productId === p.id));
    const first = unused[0];
    if (!first) return;
    set({
      productAddons: [...form.productAddons, {
        productId: first.id, productName: first.title || first.name,
        required: false, maxQuantity: 1,
      }],
    });
  };
  const updateAddon = (idx: number, updates: Partial<ProductAddon>) => {
    set({ productAddons: form.productAddons.map((a, i) => i === idx ? { ...a, ...updates } : a) });
  };
  const removeAddon = (idx: number) => {
    set({ productAddons: form.productAddons.filter((_, i) => i !== idx) });
  };

  // ── Conference day helpers ──
  const addDay = () => {
    const lastDay = form.days[form.days.length - 1];
    const nextDate = lastDay
      ? new Date(new Date(lastDay.date).getTime() + 86400000).toISOString().slice(0, 10)
      : form.startDate || new Date().toISOString().slice(0, 10);
    set({
      days: [...form.days, {
        id: crypto.randomUUID(), date: nextDate,
        label: `Day ${form.days.length + 1}`, startTime: '09:00', endTime: '17:00',
        sessions: [],
      }],
    });
  };
  const updateDay = (id: string, updates: Partial<ConferenceDay>) => {
    set({ days: form.days.map((d) => d.id === id ? { ...d, ...updates } : d) });
  };
  const removeDay = (id: string) => {
    set({ days: form.days.filter((d) => d.id !== id) });
  };

  // ── Inline session helpers (for conference days) ──
  const addSessionToDay = (dayId: string) => {
    set({
      days: form.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              sessions: [...(d.sessions || []), {
                id: crypto.randomUUID(), title: '', type: 'breakout' as const,
                startTime: d.startTime || '09:00', endTime: '', room: '', track: '',
                capacity: 0, seatingType: 'open' as const, description: '', speakers: '',
              }],
            }
          : d
      ),
    });
  };
  const updateSessionInDay = (dayId: string, sessionId: string, updates: Partial<InlineSession>) => {
    set({
      days: form.days.map((d) =>
        d.id === dayId
          ? { ...d, sessions: (d.sessions || []).map((s) => s.id === sessionId ? { ...s, ...updates } : s) }
          : d
      ),
    });
  };
  const removeSessionFromDay = (dayId: string, sessionId: string) => {
    set({
      days: form.days.map((d) =>
        d.id === dayId
          ? { ...d, sessions: (d.sessions || []).filter((s) => s.id !== sessionId) }
          : d
      ),
    });
  };

  // ── Registration field helpers ──
  const addRegField = () => {
    set({
      registrationFields: [...form.registrationFields, {
        id: crypto.randomUUID(), label: '', type: 'text', required: false, options: '',
      }],
    });
  };
  const updateRegField = (id: string, updates: Partial<RegistrationField>) => {
    set({ registrationFields: form.registrationFields.map((f) => f.id === id ? { ...f, ...updates } : f) });
  };
  const removeRegField = (id: string) => {
    set({ registrationFields: form.registrationFields.filter((f) => f.id !== id) });
  };

  // ── Exhibitor booth zone helpers ──
  const addBoothZone = () => {
    set({
      boothZones: [...form.boothZones, {
        id: crypto.randomUUID(),
        name: `Zone ${String.fromCharCode(65 + form.boothZones.length)}`,
        color: SECTION_COLORS[form.boothZones.length % SECTION_COLORS.length] ?? '#000000',
        description: '',
      }],
    });
  };
  const updateBoothZone = (id: string, updates: Partial<BoothZone>) => {
    set({ boothZones: form.boothZones.map((z) => z.id === id ? { ...z, ...updates } : z) });
  };
  const removeBoothZone = (id: string) => {
    set({ boothZones: form.boothZones.filter((z) => z.id !== id) });
  };

  // ── Exhibitor booth helpers ──
  const addExhibitorBooth = (zoneId?: string) => {
    const zone = zoneId ? form.boothZones.find((z) => z.id === zoneId) : form.boothZones[0];
    const boothNum = form.exhibitorBooths.length + 1;
    set({
      exhibitorBooths: [...form.exhibitorBooths, {
        id: crypto.randomUUID(),
        boothNumber: `${zone?.name?.charAt(0) || 'B'}${String(boothNum).padStart(2, '0')}`,
        zoneId: zone?.id || '',
        size: 'medium', width: 10, depth: 10,
        price: 0, status: 'available',
        assignedTo: '', amenities: ['Standard Power (110V)', 'Wi-Fi', 'Draped Table (6\')'],
        notes: '',
      }],
    });
  };
  const addBoothBatch = (zoneId: string, count: number, size: string) => {
    const zone = form.boothZones.find((z) => z.id === zoneId);
    const sizeObj = BOOTH_SIZES.find((s) => s.value === size);
    const startNum = form.exhibitorBooths.filter((b) => b.zoneId === zoneId).length + 1;
    const newBooths: ExhibitorBooth[] = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      boothNumber: `${zone?.name?.charAt(0) || 'B'}${String(startNum + i).padStart(2, '0')}`,
      zoneId,
      size: size as any, width: sizeObj?.width || 10, depth: sizeObj?.depth || 10,
      price: 0, status: 'available' as const,
      assignedTo: '', amenities: ['Standard Power (110V)', 'Wi-Fi'],
      notes: '',
    }));
    set({ exhibitorBooths: [...form.exhibitorBooths, ...newBooths] });
  };
  const updateExhibitorBooth = (id: string, updates: Partial<ExhibitorBooth>) => {
    set({ exhibitorBooths: form.exhibitorBooths.map((b) => b.id === id ? { ...b, ...updates } : b) });
  };
  const removeExhibitorBooth = (id: string) => {
    set({ exhibitorBooths: form.exhibitorBooths.filter((b) => b.id !== id) });
  };
  const toggleBoothAmenity = (boothId: string, amenity: string) => {
    const booth = form.exhibitorBooths.find((b) => b.id === boothId);
    if (!booth) return;
    const amenities = booth.amenities.includes(amenity)
      ? booth.amenities.filter((a) => a !== amenity)
      : [...booth.amenities, amenity];
    updateExhibitorBooth(boothId, { amenities });
  };

  // ── Exhibitor ticket type helpers ──
  const addExhibitorTicket = () => {
    set({
      exhibitorTicketTypes: [...form.exhibitorTicketTypes, {
        ...EMPTY_EXHIBITOR_TICKET,
        id: crypto.randomUUID(),
        name: `Exhibitor ${form.exhibitorTicketTypes.length > 0 ? `Package ${form.exhibitorTicketTypes.length + 1}` : 'Booth'}`,
      }],
    });
  };
  const updateExhibitorTicket = (id: string, updates: Partial<ExhibitorTicketType>) => {
    set({ exhibitorTicketTypes: form.exhibitorTicketTypes.map((t) => t.id === id ? { ...t, ...updates } : t) });
  };
  const removeExhibitorTicket = (id: string) => {
    set({ exhibitorTicketTypes: form.exhibitorTicketTypes.filter((t) => t.id !== id) });
  };
  const toggleExhibitorPerk = (ticketId: string, perk: string) => {
    const ticket = form.exhibitorTicketTypes.find((t) => t.id === ticketId);
    if (!ticket) return;
    const perksIncluded = ticket.perksIncluded.includes(perk)
      ? ticket.perksIncluded.filter((p) => p !== perk)
      : [...ticket.perksIncluded, perk];
    updateExhibitorTicket(ticketId, { perksIncluded });
  };

  // ── Sponsor tier helpers ──
  const addTier = () => {
    set({
      sponsorTiers: [...form.sponsorTiers, {
        id: crypto.randomUUID(), name: '', color: '#6b7280',
        price: 0, maxSponsors: 0, order: form.sponsorTiers.length, benefits: [],
      }],
    });
  };
  const updateTier = (id: string, updates: Partial<SponsorTier>) => {
    set({ sponsorTiers: form.sponsorTiers.map((t) => t.id === id ? { ...t, ...updates } : t) });
  };
  const removeTier = (id: string) => {
    set({ sponsorTiers: form.sponsorTiers.filter((t) => t.id !== id) });
  };
  const moveTier = (id: string, direction: -1 | 1) => {
    const idx = form.sponsorTiers.findIndex((t) => t.id === id);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.sponsorTiers.length - 1)) return;
    const arr = [...form.sponsorTiers];
    const a = arr[idx]; const b = arr[idx + direction];
    if (!a || !b) return;
    [arr[idx], arr[idx + direction]] = [b, a];
    set({ sponsorTiers: arr.map((t, i) => ({ ...t, order: i })) });
  };
  const toggleTierBenefit = (tierId: string, benefit: string) => {
    const tier = form.sponsorTiers.find((t) => t.id === tierId);
    if (!tier) return;
    const benefits = tier.benefits.includes(benefit)
      ? tier.benefits.filter((b) => b !== benefit)
      : [...tier.benefits, benefit];
    updateTier(tierId, { benefits });
  };

  // ── Benefit options helpers ──
  const addBenefitOption = (name: string) => {
    if (!name.trim() || form.sponsorBenefitOptions.includes(name.trim())) return;
    set({ sponsorBenefitOptions: [...form.sponsorBenefitOptions, name.trim()] });
  };
  const removeBenefitOption = (name: string) => {
    set({ sponsorBenefitOptions: form.sponsorBenefitOptions.filter((b) => b !== name) });
  };

  // ── Sponsor helpers ──
  const addSponsor = (tierId?: string) => {
    const tier = tierId ? form.sponsorTiers.find((t) => t.id === tierId) : form.sponsorTiers[0];
    set({
      sponsors: [...form.sponsors, {
        ...EMPTY_SPONSOR,
        id: crypto.randomUUID(),
        tierId: tier?.id || '',
        amount: tier?.price || 0,
        benefits: tier ? [...tier.benefits] : [],
        booth: { ...EMPTY_BOOTH },
        discount: { ...EMPTY_DISCOUNT },
        order: form.sponsors.length,
      }],
    });
  };
  const updateSponsor = (id: string, updates: Partial<Sponsor>) => {
    set({ sponsors: form.sponsors.map((s) => s.id === id ? { ...s, ...updates } : s) });
  };
  const removeSponsor = (id: string) => {
    set({ sponsors: form.sponsors.filter((s) => s.id !== id) });
  };
  const moveSponsor = (id: string, direction: -1 | 1) => {
    const idx = form.sponsors.findIndex((s) => s.id === id);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.sponsors.length - 1)) return;
    const arr = [...form.sponsors];
    const a = arr[idx]; const b = arr[idx + direction];
    if (!a || !b) return;
    [arr[idx], arr[idx + direction]] = [b, a];
    set({ sponsors: arr.map((s, i) => ({ ...s, order: i })) });
  };
  const updateSponsorBooth = (sponsorId: string, updates: Partial<BoothReservation>) => {
    const sponsor = form.sponsors.find((s) => s.id === sponsorId);
    if (!sponsor) return;
    updateSponsor(sponsorId, { booth: { ...sponsor.booth, ...updates } });
  };
  const updateSponsorDiscount = (sponsorId: string, updates: Partial<SponsorDiscount>) => {
    const sponsor = form.sponsors.find((s) => s.id === sponsorId);
    if (!sponsor) return;
    updateSponsor(sponsorId, { discount: { ...sponsor.discount, ...updates } });
  };
  const toggleSponsorBenefit = (sponsorId: string, benefit: string) => {
    const sponsor = form.sponsors.find((s) => s.id === sponsorId);
    if (!sponsor) return;
    const benefits = sponsor.benefits.includes(benefit)
      ? sponsor.benefits.filter((b) => b !== benefit)
      : [...sponsor.benefits, benefit];
    updateSponsor(sponsorId, { benefits });
  };
  const assignTierToSponsor = (sponsorId: string, tierId: string) => {
    const tier = form.sponsorTiers.find((t) => t.id === tierId);
    updateSponsor(sponsorId, {
      tierId,
      amount: tier?.price || 0,
      benefits: tier ? [...tier.benefits] : [],
    });
  };
  const generateDiscountCode = (sponsorId: string) => {
    const sponsor = form.sponsors.find((s) => s.id === sponsorId);
    if (!sponsor) return;
    const prefix = sponsor.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const code = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    updateSponsorDiscount(sponsorId, { code });
  };

  // ── Badge template helpers ──
  const setBadge = (updates: Partial<BadgeTemplate>) => set({ badgeTemplate: { ...form.badgeTemplate, ...updates } });

  // Badge preview dimensions
  const badgeScale = form.badgeTemplate.unit === 'mm' ? 2 : 72;
  const badgePreviewW = form.badgeTemplate.orientation === 'landscape' ? form.badgeTemplate.width * badgeScale : form.badgeTemplate.height * badgeScale;
  const badgePreviewH = form.badgeTemplate.orientation === 'landscape' ? form.badgeTemplate.height * badgeScale : form.badgeTemplate.width * badgeScale;
  const maxBadgePreviewW = 360;
  const badgeScaleFactor = badgePreviewW > maxBadgePreviewW ? maxBadgePreviewW / badgePreviewW : 1;

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'tickets' as const, label: 'Tickets & Add-ons' },
    { id: 'venue' as const, label: 'Venue & Seating' },
    { id: 'schedule' as const, label: 'Schedule' },
    { id: 'exhibitors' as const, label: 'Exhibitor Booths' },
    { id: 'sponsors' as const, label: 'Sponsors' },
    { id: 'badges' as const, label: 'Badges' },
    { id: 'registration' as const, label: 'Registration' },
    { id: 'seo' as const, label: 'SEO' },
  ];

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
  const smallLabelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ── */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    set({
                      title,
                      slug: form.slug === autoSlug(form.title) || !form.slug ? autoSlug(title) : form.slug,
                    });
                  }}
                  className={inputCls}
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => set({ slug: e.target.value })}
                  className={inputCls}
                  placeholder="auto-generated"
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={(e) => set({ status: e.target.value as any })} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Event Type *</label>
                <select value={form.type} onChange={(e) => set({ type: e.target.value as any })} className={inputCls}>
                  <option value="in_person">In Person</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Event Format</label>
                <select
                  value={form.format}
                  onChange={(e) => set({ format: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="single">Single Event</option>
                  <option value="multi_day">Multi-Day Event</option>
                  <option value="conference">Conference</option>
                  <option value="recurring">Recurring Event</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Short Description</label>
                <input
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) => set({ shortDescription: e.target.value })}
                  className={inputCls}
                  placeholder="Brief summary for listings"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Full Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={5}
                  className={inputCls}
                  placeholder="Detailed event description..."
                />
              </div>
              <div className="col-span-2">
                <MediaPicker
                  label="Event Image"
                  value={form.image}
                  onChange={(v) => set({ image: v })}
                  accept="image/*"
                  helpText="Main event banner image (recommended 1200x630)"
                />
              </div>
            </div>
          </div>

          {/* Virtual Settings (shown for virtual/hybrid) */}
          {(form.type === 'virtual' || form.type === 'hybrid') && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Virtual Event Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Platform</label>
                  <select
                    value={form.virtualPlatform}
                    onChange={(e) => set({ virtualPlatform: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select platform...</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="meet">Google Meet</option>
                    <option value="webex">Webex</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Meeting URL</label>
                  <input
                    type="url"
                    value={form.virtualUrl}
                    onChange={(e) => set({ virtualUrl: e.target.value })}
                    className={inputCls}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Join Instructions</label>
                  <textarea
                    value={form.virtualInstructions}
                    onChange={(e) => set({ virtualInstructions: e.target.value })}
                    rows={3}
                    className={inputCls}
                    placeholder="Instructions sent to attendees..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category & Tags */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Organization</h2>
              <div className="flex gap-3">
                <Link href="/event-categories" className="text-xs text-blue-500 hover:text-blue-700">Manage Categories</Link>
                <Link href="/event-tags" className="text-xs text-blue-500 hover:text-blue-700">Manage Tags</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Category</label>
                <div>
                  {form.category && (
                    <div className="flex items-center gap-1 mb-2">
                      {(() => {
                        const cat = eventCategories.find((c) => c.slug === form.category);
                        return cat ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: cat.color ? `${cat.color}20` : '#f3f4f6', color: cat.color || '#4b5563' }}
                          >
                            {cat.name}
                            <button type="button" onClick={() => set({ category: '' })} className="ml-0.5 text-current opacity-60 hover:opacity-100">&times;</button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {form.category}
                            <button type="button" onClick={() => set({ category: '' })} className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <select
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">No category</option>
                    {eventCategories.length > 0 ? (
                      eventCategories.filter((c) => !c.parentId).map((c) => {
                        const children = eventCategories.filter((ch) => ch.parentId === c.id);
                        return [
                          <option key={c.slug} value={c.slug}>{c.name}</option>,
                          ...children.map((ch) => (
                            <option key={ch.slug} value={ch.slug}>&nbsp;&nbsp;{ch.name}</option>
                          )),
                        ];
                      })
                    ) : (
                      <option disabled>No categories created yet</option>
                    )}
                  </select>
                  {eventCategories.length === 0 && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      <Link href="/event-categories" className="text-blue-500 hover:text-blue-700">Create event categories</Link> to organize events
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Tags</label>
                <div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {form.tags.map((tag) => {
                        const tagObj = eventTags.find((t) => t.slug === tag);
                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: tagObj?.color ? `${tagObj.color}20` : '#f3f4f6', color: tagObj?.color || '#4b5563' }}
                          >
                            {tagObj?.name || tag}
                            <button type="button" onClick={() => set({ tags: form.tags.filter((t) => t !== tag) })} className="ml-0.5 text-current opacity-60 hover:opacity-100">&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !form.tags.includes(e.target.value)) {
                        set({ tags: [...form.tags, e.target.value] });
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Add tag...</option>
                    {eventTags.length > 0 ? (
                      eventTags.filter((t) => !form.tags.includes(t.slug)).map((t) => (
                        <option key={t.slug} value={t.slug}>{t.name}</option>
                      ))
                    ) : (
                      <option disabled>No tags created yet</option>
                    )}
                  </select>
                  {eventTags.length === 0 && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      <Link href="/event-tags" className="text-blue-500 hover:text-blue-700">Create event tags</Link> for filtering and organization
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TICKETS & ADD-ONS TAB ── */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Free Event Toggle */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure ticket types and pricing</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFreeEvent}
                  onChange={(e) => set({ isFreeEvent: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">Free event (no ticket cost)</span>
              </label>
            </div>
          </div>

          {/* Ticket Types */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Ticket Types</h2>
              <button type="button" onClick={addTicketType} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                Add Ticket Type
              </button>
            </div>
            {form.ticketTypes.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-sm text-gray-400">No ticket types yet.</p>
                <button type="button" onClick={addTicketType} className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                  Add your first ticket type
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {form.ticketTypes.map((ticket, idx) => (
                  <div key={ticket.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-800">Ticket #{idx + 1}</h3>
                      <button type="button" onClick={() => removeTicket(ticket.id)} className="text-xs text-red-500 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={smallLabelCls}>Name *</label>
                        <input type="text" value={ticket.name} onChange={(e) => updateTicket(ticket.id, { name: e.target.value })} className={inputCls} placeholder="e.g. General Admission" />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Price</label>
                        <input type="number" step="0.01" min="0" value={ticket.price} onChange={(e) => updateTicket(ticket.id, { price: +e.target.value })} className={inputCls} disabled={form.isFreeEvent} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Quantity Available</label>
                        <input type="number" min="1" value={ticket.quantity} onChange={(e) => updateTicket(ticket.id, { quantity: +e.target.value })} className={inputCls} />
                      </div>
                      <div className="col-span-3">
                        <label className={smallLabelCls}>Description</label>
                        <input type="text" value={ticket.description} onChange={(e) => updateTicket(ticket.id, { description: e.target.value })} className={inputCls} placeholder="What's included with this ticket" />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Min Per Order</label>
                        <input type="number" min="1" value={ticket.minPerOrder} onChange={(e) => updateTicket(ticket.id, { minPerOrder: +e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Max Per Order</label>
                        <input type="number" min="1" value={ticket.maxPerOrder} onChange={(e) => updateTicket(ticket.id, { maxPerOrder: +e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Seating</label>
                        <select value={ticket.seatingType} onChange={(e) => updateTicket(ticket.id, { seatingType: e.target.value as any })} className={inputCls}>
                          <option value="open">Open Seating</option>
                          <option value="reserved">Reserved Seating</option>
                        </select>
                      </div>
                      {ticket.seatingType === 'reserved' && form.seatSections.length > 0 && (
                        <div>
                          <label className={smallLabelCls}>Seat Section</label>
                          <select value={ticket.seatMapSection} onChange={(e) => updateTicket(ticket.id, { seatMapSection: e.target.value })} className={inputCls}>
                            <option value="">Any section</option>
                            {form.seatSections.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className={smallLabelCls}>Sale Start</label>
                        <input type="datetime-local" value={ticket.saleStart} onChange={(e) => updateTicket(ticket.id, { saleStart: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Sale End</label>
                        <input type="datetime-local" value={ticket.saleEnd} onChange={(e) => updateTicket(ticket.id, { saleEnd: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Visibility</label>
                        <select value={ticket.visibility} onChange={(e) => updateTicket(ticket.id, { visibility: e.target.value as any })} className={inputCls}>
                          <option value="visible">Visible</option>
                          <option value="hidden">Hidden</option>
                          <option value="password">Password Protected</option>
                        </select>
                      </div>
                      {ticket.visibility === 'password' && (
                        <div>
                          <label className={smallLabelCls}>Access Password</label>
                          <input type="text" value={ticket.password} onChange={(e) => updateTicket(ticket.id, { password: e.target.value })} className={inputCls} />
                        </div>
                      )}
                    </div>
                    {/* Early Bird & Group Discount */}
                    {!form.isFreeEvent && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase">Promotions</p>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className={smallLabelCls}>Early Bird Price</label>
                            <input type="number" step="0.01" min="0" value={ticket.earlyBirdPrice} onChange={(e) => updateTicket(ticket.id, { earlyBirdPrice: +e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Early Bird Ends</label>
                            <input type="datetime-local" value={ticket.earlyBirdEnd} onChange={(e) => updateTicket(ticket.id, { earlyBirdEnd: e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Group Discount %</label>
                            <input type="number" min="0" max="100" value={ticket.groupDiscount} onChange={(e) => updateTicket(ticket.id, { groupDiscount: +e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Group Min Size</label>
                            <input type="number" min="2" value={ticket.groupMinSize} onChange={(e) => updateTicket(ticket.id, { groupMinSize: +e.target.value })} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Add-ons */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Product Add-ons</h2>
                <p className="text-xs text-gray-400 mt-0.5">Attach products from your catalog as optional or required add-ons</p>
              </div>
              <button type="button" onClick={addProductAddon} disabled={!products.length} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40">
                Add Product
              </button>
            </div>
            {form.productAddons.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No product add-ons attached.</p>
            ) : (
              <div className="space-y-2">
                {form.productAddons.map((addon, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                    <div className="flex-1">
                      <select
                        value={addon.productId}
                        onChange={(e) => {
                          const p = products.find((pr: any) => pr.id === e.target.value);
                          updateAddon(idx, { productId: e.target.value, productName: p?.title || p?.name || '' });
                        }}
                        className={inputCls}
                      >
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.title || p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className={smallLabelCls}>Max Qty</label>
                      <input type="number" min="1" value={addon.maxQuantity} onChange={(e) => updateAddon(idx, { maxQuantity: +e.target.value })} className={inputCls} />
                    </div>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={addon.required} onChange={(e) => updateAddon(idx, { required: e.target.checked })} className="rounded border-gray-300" />
                      Required
                    </label>
                    <button type="button" onClick={() => removeAddon(idx)} className="text-red-400 hover:text-red-600">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waitlist */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Waitlist</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.waitlistEnabled} onChange={(e) => set({ waitlistEnabled: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-gray-700">Enable waitlist when tickets sell out</span>
              </label>
              {form.waitlistEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className={smallLabelCls}>Waitlist Capacity</label>
                    <input type="number" min="1" value={form.waitlistCapacity} onChange={(e) => set({ waitlistCapacity: +e.target.value })} className={inputCls} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm pb-2">
                      <input type="checkbox" checked={form.waitlistAutoPromote} onChange={(e) => set({ waitlistAutoPromote: e.target.checked })} className="rounded border-gray-300" />
                      <span className="text-gray-700">Auto-promote when spots open</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VENUE & SEATING TAB ── */}
      {activeTab === 'venue' && (
        <div className="space-y-6">
          {(form.type === 'in_person' || form.type === 'hybrid') && (
            <>
              {/* Venue Selection */}
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Venue</h2>
                  <Link href="/venues" className="text-xs text-blue-500 hover:text-blue-700">Manage Venues &rarr;</Link>
                </div>

                {/* Venue picker — primary selection */}
                <div className="mb-5">
                  <label className={labelCls}>Select Venue</label>
                  <select
                    value={form.venueId}
                    onChange={(e) => {
                      const v = venues.find((ven: any) => ven.id === e.target.value);
                      if (v) {
                        set({
                          venueId: v.id, venueName: v.name,
                          venueAddress: v.address || '', venueCity: v.city || '',
                          venueState: v.state || '', venueZip: v.zip || '',
                          venueCountry: v.country || 'US', venueCapacity: v.capacity || 0,
                          venueNotes: v.parkingInfo ? `Parking: ${v.parkingInfo}` : form.venueNotes,
                          venueMapImage: v.mapImage || v.image || form.venueMapImage,
                        });
                      } else {
                        set({
                          venueId: '', venueName: '', venueAddress: '', venueCity: '',
                          venueState: '', venueZip: '', venueCountry: 'US', venueCapacity: 0,
                          venueNotes: '', venueMapImage: '',
                        });
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">-- Choose a saved venue or enter manually --</option>
                    {venues.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name}{v.city ? ` \u2014 ${v.city}${v.state ? ', ' + v.state : ''}` : ''}{v.capacity ? ` (cap. ${v.capacity})` : ''}
                      </option>
                    ))}
                  </select>
                  {venues.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      No saved venues. <Link href="/venues" className="text-blue-500 hover:text-blue-700">Create one</Link> for easy reuse, or fill in the details below.
                    </p>
                  )}
                </div>

                {/* Selected venue summary */}
                {form.venueId && (
                  <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">{form.venueName}</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          {[form.venueAddress, form.venueCity, form.venueState, form.venueZip].filter(Boolean).join(', ')}
                        </p>
                        {form.venueCapacity > 0 && (
                          <p className="text-xs text-blue-600 mt-0.5">Capacity: {form.venueCapacity}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => set({ venueId: '' })} className="text-xs text-blue-500 hover:text-blue-700">
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual entry fields — shown when no venue selected, or for overrides */}
                {!form.venueId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelCls}>Venue Name *</label>
                      <input type="text" value={form.venueName} onChange={(e) => set({ venueName: e.target.value })} className={inputCls} placeholder="Venue name" />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Street Address</label>
                      <input type="text" value={form.venueAddress} onChange={(e) => set({ venueAddress: e.target.value })} className={inputCls} placeholder="123 Main St" />
                    </div>
                    <div>
                      <label className={labelCls}>City</label>
                      <input type="text" value={form.venueCity} onChange={(e) => set({ venueCity: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>State / Province</label>
                      <input type="text" value={form.venueState} onChange={(e) => set({ venueState: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Zip / Postal Code</label>
                      <input type="text" value={form.venueZip} onChange={(e) => set({ venueZip: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Country</label>
                      <input type="text" value={form.venueCountry} onChange={(e) => set({ venueCountry: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Venue Capacity</label>
                      <input type="number" min="0" value={form.venueCapacity} onChange={(e) => set({ venueCapacity: +e.target.value })} className={inputCls} />
                    </div>
                  </div>
                )}

                {/* Room / event-specific overrides — always shown */}
                <div className={`grid grid-cols-2 gap-4 ${!form.venueId ? 'mt-4 border-t border-gray-200 pt-4' : ''}`}>
                  <div>
                    <label className={labelCls}>Room / Hall</label>
                    <input type="text" value={form.venueRoom} onChange={(e) => set({ venueRoom: e.target.value })} className={inputCls} placeholder="e.g. Ballroom A" />
                  </div>
                  {form.venueId && (
                    <div>
                      <label className={labelCls}>Venue Capacity</label>
                      <input type="number" min="0" value={form.venueCapacity} onChange={(e) => set({ venueCapacity: +e.target.value })} className={inputCls} />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className={labelCls}>Venue Notes</label>
                    <textarea value={form.venueNotes} onChange={(e) => set({ venueNotes: e.target.value })} rows={2} className={inputCls} placeholder="Parking info, directions, etc." />
                  </div>
                  <div className="col-span-2">
                    <MediaPicker label="Venue Map Image" value={form.venueMapImage} onChange={(v) => set({ venueMapImage: v })} accept="image/*" helpText="Upload venue map or floor plan" />
                  </div>
                </div>
              </div>

              {/* Reserved Seating */}
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Reserved Seating</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Configure seating sections and seat map for reserved seating</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.reservedSeating} onChange={(e) => set({ reservedSeating: e.target.checked })} className="rounded border-gray-300" />
                    <span className="text-gray-700">Enable reserved seating</span>
                  </label>
                </div>

                {form.reservedSeating && (
                  <>
                    <div className="mb-4">
                      <MediaPicker label="Seat Map Diagram" value={form.seatMapImage} onChange={(v) => set({ seatMapImage: v })} accept="image/*" helpText="Upload venue seating diagram/layout for attendees to select seats" />
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-700">Seating Sections</h3>
                      <button type="button" onClick={addSeatSection} className="text-xs text-blue-600 hover:text-blue-800">+ Add Section</button>
                    </div>

                    {form.seatSections.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No seating sections defined.</p>
                    ) : (
                      <div className="space-y-3">
                        {form.seatSections.map((section) => (
                          <div key={section.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                            <div className="h-8 w-8 rounded" style={{ backgroundColor: section.color }} />
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              <div>
                                <label className={smallLabelCls}>Name</label>
                                <input type="text" value={section.name} onChange={(e) => updateSection(section.id, { name: e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Rows</label>
                                <input type="number" min="1" value={section.rows} onChange={(e) => updateSection(section.id, { rows: +e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Seats/Row</label>
                                <input type="number" min="1" value={section.seatsPerRow} onChange={(e) => updateSection(section.id, { seatsPerRow: +e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Price</label>
                                <input type="number" step="0.01" min="0" value={section.price} onChange={(e) => updateSection(section.id, { price: +e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Color</label>
                                <input type="color" value={section.color} onChange={(e) => updateSection(section.id, { color: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{section.rows * section.seatsPerRow} seats</div>
                            <button type="button" onClick={() => removeSection(section.id)} className="text-red-400 hover:text-red-600">&times;</button>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500 text-right">
                          Total capacity: {form.seatSections.reduce((sum, s) => sum + s.rows * s.seatsPerRow, 0)} seats
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {form.type === 'virtual' && (
            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-gray-500 text-center py-8">
                Virtual events don't require a physical venue. Configure virtual settings in the Details tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Event Format Selector — prominent at top of Schedule tab */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Event Format</h2>
            <p className="text-xs text-gray-500 mb-4">Choose how this event is structured. This determines the scheduling options below.</p>
            <div className="grid grid-cols-4 gap-3">
              {([
                { value: 'single', label: 'Single Event', desc: 'One-time event on a specific date', icon: '\u{1F4C5}' },
                { value: 'recurring', label: 'Recurring', desc: 'Repeats on a schedule (weekly, monthly, etc.)', icon: '\u{1F501}' },
                { value: 'multi_day', label: 'Multi-Day', desc: 'Spans multiple consecutive days', icon: '\u{1F4C6}' },
                { value: 'conference', label: 'Conference', desc: 'Multi-day with breakout sessions and tracks', icon: '\u{1F3E2}' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ format: opt.value })}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    form.format === opt.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <p className={`mt-2 text-sm font-semibold ${form.format === opt.value ? 'text-blue-700' : 'text-gray-900'}`}>{opt.label}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time — always shown */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {form.format === 'recurring' ? 'First Occurrence' : form.format === 'multi_day' || form.format === 'conference' ? 'Overall Event Dates' : 'Date & Time'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date *</label>
                <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Start Time *</label>
                <input type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Time</label>
                <input type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Timezone</label>
                <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className={inputCls}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── RECURRING EVENT SETTINGS ── */}
          {form.format === 'recurring' && (
            <div className="rounded-lg bg-white p-5 shadow border-l-4 border-blue-500">
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Recurrence Pattern</h2>
              <p className="text-xs text-gray-500 mb-4">Define how often this event repeats and when it ends.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Frequency</label>
                  <select
                    value={form.recurrence.frequency}
                    onChange={(e) => set({ recurrence: { ...form.recurrence, frequency: e.target.value as any } })}
                    className={inputCls}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Repeat Every</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" value={form.recurrence.interval} onChange={(e) => set({ recurrence: { ...form.recurrence, interval: +e.target.value } })} className={inputCls} />
                    <span className="text-sm text-gray-500 whitespace-nowrap">{form.recurrence.frequency === 'daily' ? 'day(s)' : form.recurrence.frequency === 'monthly' ? 'month(s)' : 'week(s)'}</span>
                  </div>
                </div>
                {(form.recurrence.frequency === 'weekly' || form.recurrence.frequency === 'biweekly') && (
                  <div className="col-span-2">
                    <label className={labelCls}>On These Days</label>
                    <div className="flex gap-2 mt-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = form.recurrence.daysOfWeek.includes(i)
                              ? form.recurrence.daysOfWeek.filter((d) => d !== i)
                              : [...form.recurrence.daysOfWeek, i];
                            set({ recurrence: { ...form.recurrence, daysOfWeek: days } });
                          }}
                          className={`h-9 w-12 rounded-md text-xs font-medium transition-colors ${
                            form.recurrence.daysOfWeek.includes(i)
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelCls}>Series Ends</label>
                  <select value={form.recurrence.endType} onChange={(e) => set({ recurrence: { ...form.recurrence, endType: e.target.value as any } })} className={inputCls}>
                    <option value="never">Never (ongoing)</option>
                    <option value="date">On a Specific Date</option>
                    <option value="count">After a Number of Occurrences</option>
                  </select>
                </div>
                {form.recurrence.endType === 'date' && (
                  <div>
                    <label className={labelCls}>Series End Date</label>
                    <input type="date" value={form.recurrence.endDate} onChange={(e) => set({ recurrence: { ...form.recurrence, endDate: e.target.value } })} className={inputCls} />
                  </div>
                )}
                {form.recurrence.endType === 'count' && (
                  <div>
                    <label className={labelCls}>Total Occurrences</label>
                    <input type="number" min="1" value={form.recurrence.endCount} onChange={(e) => set({ recurrence: { ...form.recurrence, endCount: +e.target.value } })} className={inputCls} />
                  </div>
                )}
              </div>
              {/* Recurrence Summary */}
              <div className="mt-4 rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Preview: </span>
                  {form.recurrence.frequency === 'daily' && `Every ${form.recurrence.interval > 1 ? form.recurrence.interval + ' days' : 'day'}`}
                  {form.recurrence.frequency === 'weekly' && `Every ${form.recurrence.interval > 1 ? form.recurrence.interval + ' weeks' : 'week'}${form.recurrence.daysOfWeek.length ? ' on ' + form.recurrence.daysOfWeek.sort().map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : ''}`}
                  {form.recurrence.frequency === 'biweekly' && `Every 2 weeks${form.recurrence.daysOfWeek.length ? ' on ' + form.recurrence.daysOfWeek.sort().map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') : ''}`}
                  {form.recurrence.frequency === 'monthly' && `Every ${form.recurrence.interval > 1 ? form.recurrence.interval + ' months' : 'month'}`}
                  {form.startDate && ` starting ${new Date(form.startDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  {form.recurrence.endType === 'never' && ', repeating indefinitely'}
                  {form.recurrence.endType === 'count' && `, ${form.recurrence.endCount} times total`}
                  {form.recurrence.endType === 'date' && form.recurrence.endDate && `, until ${new Date(form.recurrence.endDate + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  {form.startTime && ` at ${form.startTime}`}
                </p>
              </div>
            </div>
          )}

          {/* ── MULTI-DAY / CONFERENCE DAYS + SESSIONS ── */}
          {(form.format === 'multi_day' || form.format === 'conference') && (
            <div className="rounded-lg bg-white p-5 shadow border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {form.format === 'conference' ? 'Conference Schedule' : 'Multi-Day Schedule'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {form.format === 'conference'
                      ? 'Define each conference day and its breakout sessions, keynotes, and workshops'
                      : 'Define each day of the multi-day event'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDay}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                >
                  + Add Day
                </button>
              </div>
              {form.days.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="text-lg text-gray-300">{form.format === 'conference' ? '\u{1F3E2}' : '\u{1F4C6}'}</p>
                  <p className="mt-2 text-sm text-gray-400">No days configured yet.</p>
                  <button type="button" onClick={addDay} className="mt-2 text-xs text-purple-600 hover:text-purple-800">
                    Add the first day
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.days.map((day, idx) => (
                    <div key={day.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      {/* Day Header */}
                      <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">{idx + 1}</span>
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <input type="text" value={day.label} onChange={(e) => updateDay(day.id, { label: e.target.value })} className={inputCls} placeholder="Day label" />
                          </div>
                          <div>
                            <input type="date" value={day.date} onChange={(e) => updateDay(day.id, { date: e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <div className="flex gap-1">
                              <input type="time" value={day.startTime} onChange={(e) => updateDay(day.id, { startTime: e.target.value })} className={inputCls} />
                              <span className="self-center text-gray-400 text-xs">to</span>
                              <input type="time" value={day.endTime} onChange={(e) => updateDay(day.id, { endTime: e.target.value })} className={inputCls} />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            {form.format === 'conference' && (
                              <button
                                type="button"
                                onClick={() => addSessionToDay(day.id)}
                                className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                              >
                                + Add Session
                              </button>
                            )}
                            <button type="button" onClick={() => removeDay(day.id)} className="text-red-400 hover:text-red-600 text-sm">&times;</button>
                          </div>
                        </div>
                      </div>

                      {/* Sessions within this day (conference format) */}
                      {form.format === 'conference' && (
                        <div className="px-4 py-3">
                          {(!day.sessions || day.sessions.length === 0) ? (
                            <div className="rounded border border-dashed border-gray-200 py-6 text-center">
                              <p className="text-xs text-gray-400">No sessions for {day.label || `Day ${idx + 1}`}.</p>
                              <button type="button" onClick={() => addSessionToDay(day.id)} className="mt-1 text-xs text-blue-600 hover:text-blue-800">
                                Add a keynote, breakout, or workshop
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase text-gray-500 tracking-wider mb-2">
                                Sessions ({day.sessions.length})
                              </p>
                              {(day.sessions || []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map((session) => (
                                <div key={session.id} className="rounded-md border border-gray-200 p-3">
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2">
                                      <label className={smallLabelCls}>Session Title *</label>
                                      <input type="text" value={session.title} onChange={(e) => updateSessionInDay(day.id, session.id, { title: e.target.value })} className={inputCls} placeholder="Session title" />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Type</label>
                                      <select value={session.type} onChange={(e) => updateSessionInDay(day.id, session.id, { type: e.target.value as any })} className={inputCls}>
                                        <option value="keynote">Keynote</option>
                                        <option value="breakout">Breakout</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="panel">Panel</option>
                                        <option value="networking">Networking</option>
                                        <option value="break">Break / Lunch</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                    <div className="flex items-end">
                                      <button type="button" onClick={() => removeSessionFromDay(day.id, session.id)} className="mb-1 text-xs text-red-500 hover:text-red-700">Remove</button>
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Start Time</label>
                                      <input type="time" value={session.startTime} onChange={(e) => updateSessionInDay(day.id, session.id, { startTime: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>End Time</label>
                                      <input type="time" value={session.endTime} onChange={(e) => updateSessionInDay(day.id, session.id, { endTime: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Room</label>
                                      <input type="text" value={session.room} onChange={(e) => updateSessionInDay(day.id, session.id, { room: e.target.value })} className={inputCls} placeholder="e.g. Ballroom A" />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Track</label>
                                      <input type="text" value={session.track} onChange={(e) => updateSessionInDay(day.id, session.id, { track: e.target.value })} className={inputCls} placeholder="e.g. Technical" />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Capacity</label>
                                      <input type="number" min="0" value={session.capacity} onChange={(e) => updateSessionInDay(day.id, session.id, { capacity: +e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Seating</label>
                                      <select value={session.seatingType} onChange={(e) => updateSessionInDay(day.id, session.id, { seatingType: e.target.value as any })} className={inputCls}>
                                        <option value="open">Open Seating</option>
                                        <option value="reserved">Reserved Seating</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Speakers</label>
                                      <input type="text" value={session.speakers} onChange={(e) => updateSessionInDay(day.id, session.id, { speakers: e.target.value })} className={inputCls} placeholder="Comma-separated names" />
                                    </div>
                                    <div>
                                      <label className={smallLabelCls}>Description</label>
                                      <input type="text" value={session.description} onChange={(e) => updateSessionInDay(day.id, session.id, { description: e.target.value })} className={inputCls} placeholder="Brief session description" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addSessionToDay(day.id)}
                                className="w-full rounded-md border-2 border-dashed border-gray-200 py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
                              >
                                + Add another session to {day.label || `Day ${idx + 1}`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {form.format === 'conference' && form.days.length > 0 && (
                <div className="mt-4 rounded-md bg-purple-50 p-3">
                  <p className="text-xs text-purple-700">
                    <span className="font-semibold">Tip: </span>
                    {form.days.reduce((sum, d) => sum + (d.sessions?.length || 0), 0)} session{form.days.reduce((sum, d) => sum + (d.sessions?.length || 0), 0) !== 1 ? 's' : ''} across {form.days.length} day{form.days.length !== 1 ? 's' : ''}.
                    {isEdit && ' You can also manage detailed sessions (with full speaker bios, surveys, etc.) from the Sessions tab after saving.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Check-in Settings */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Check-in</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.checkinEnabled} onChange={(e) => set({ checkinEnabled: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-gray-700">Enable event check-in</span>
              </label>
              {form.checkinEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className={smallLabelCls}>Check-in Opens</label>
                    <input type="datetime-local" value={form.checkinStart} onChange={(e) => set({ checkinStart: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.checkinQrCodes} onChange={(e) => set({ checkinQrCodes: e.target.checked })} className="rounded border-gray-300" />
                      <span className="text-gray-700 text-xs">QR Code check-in</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.checkinSelfService} onChange={(e) => set({ checkinSelfService: e.target.checked })} className="rounded border-gray-300" />
                      <span className="text-gray-700 text-xs">Self-service kiosk mode</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXHIBITOR BOOTHS TAB ── */}
      {activeTab === 'exhibitors' && (
        <div className="space-y-6">
          {/* Enable Toggle */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Exhibitor Booth Reservations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Allow exhibitors to reserve booths at your event, similar to reserved seating for attendees</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.exhibitorBoothsEnabled} onChange={(e) => set({ exhibitorBoothsEnabled: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-gray-700">Enable exhibitor booths</span>
              </label>
            </div>
          </div>

          {form.exhibitorBoothsEnabled && (
            <>
              {/* Floor Plan */}
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">Floor Plan</h2>
                <MediaPicker
                  label="Exhibitor Floor Plan"
                  value={form.exhibitorFloorPlanImage}
                  onChange={(v) => set({ exhibitorFloorPlanImage: v })}
                  accept="image/*"
                  helpText="Upload venue floor plan with booth locations marked. Exhibitors see this when selecting their booth."
                />
              </div>

              {/* Booth Zones */}
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Booth Zones</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Define areas on the floor plan (e.g. Hall A, Premium Row, Food Court)</p>
                  </div>
                  <button type="button" onClick={addBoothZone} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                    + Add Zone
                  </button>
                </div>
                {form.boothZones.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
                    <p className="text-xs text-gray-400">No zones defined. Add zones to organize your booths.</p>
                    <button type="button" onClick={addBoothZone} className="mt-2 text-xs text-blue-600 hover:text-blue-800">Add first zone</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.boothZones.map((zone) => (
                      <div key={zone.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                        <input type="color" value={zone.color} onChange={(e) => updateBoothZone(zone.id, { color: e.target.value })} className="h-8 w-8 rounded border border-gray-300 cursor-pointer shrink-0" />
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <label className={smallLabelCls}>Zone Name</label>
                            <input type="text" value={zone.name} onChange={(e) => updateBoothZone(zone.id, { name: e.target.value })} className={inputCls} placeholder="e.g. Hall A" />
                          </div>
                          <div className="col-span-2">
                            <label className={smallLabelCls}>Description</label>
                            <input type="text" value={zone.description} onChange={(e) => updateBoothZone(zone.id, { description: e.target.value })} className={inputCls} placeholder="Near main entrance, high foot traffic" />
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">{form.exhibitorBooths.filter((b) => b.zoneId === zone.id).length} booths</div>
                        <button type="button" onClick={() => removeBoothZone(zone.id)} className="text-red-400 hover:text-red-600 shrink-0">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booth Inventory */}
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Booth Inventory</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Define individual booths exhibitors can reserve</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.exhibitorBooths.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {form.exhibitorBooths.filter((b) => b.status === 'available').length} available / {form.exhibitorBooths.length} total
                      </span>
                    )}
                    <button type="button" onClick={() => addExhibitorBooth()} disabled={form.boothZones.length === 0} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40">
                      + Add Booth
                    </button>
                  </div>
                </div>

                {/* Batch Add */}
                {form.boothZones.length > 0 && (
                  <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase">Quick Add Multiple Booths</p>
                    <div className="flex items-end gap-3">
                      <div>
                        <label className={smallLabelCls}>Zone</label>
                        <select id="batchZone" className={inputCls + ' w-36'}>
                          {form.boothZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={smallLabelCls}>Count</label>
                        <input id="batchCount" type="number" min="1" max="50" defaultValue="10" className={inputCls + ' w-20'} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Size</label>
                        <select id="batchSize" className={inputCls + ' w-40'}>
                          {BOOTH_SIZES.filter((s) => s.value !== 'custom').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const zone = (document.getElementById('batchZone') as HTMLSelectElement)?.value;
                          const count = +(document.getElementById('batchCount') as HTMLInputElement)?.value || 10;
                          const size = (document.getElementById('batchSize') as HTMLSelectElement)?.value || 'medium';
                          if (zone) addBoothBatch(zone, count, size);
                        }}
                        className="rounded-md bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                      >
                        Add Booths
                      </button>
                    </div>
                  </div>
                )}

                {form.exhibitorBooths.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                    <p className="text-xs text-gray-400">{form.boothZones.length === 0 ? 'Create zones first, then add booths.' : 'No booths defined yet.'}</p>
                  </div>
                ) : (
                  <>
                    {/* Booth Table */}
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Booth #</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Zone</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Size</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Price</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Assigned To</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Amenities</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500 w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.exhibitorBooths.map((booth) => {
                            const zone = form.boothZones.find((z) => z.id === booth.zoneId);
                            const sizeObj = BOOTH_SIZES.find((s) => s.value === booth.size);
                            return (
                              <tr key={booth.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <input type="text" value={booth.boothNumber} onChange={(e) => updateExhibitorBooth(booth.id, { boothNumber: e.target.value })} className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs font-mono" />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: zone?.color || '#ccc' }} />
                                    <select value={booth.zoneId} onChange={(e) => updateExhibitorBooth(booth.id, { zoneId: e.target.value })} className="rounded border border-gray-200 px-1.5 py-0.5 text-xs">
                                      {form.boothZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={booth.size}
                                    onChange={(e) => {
                                      const s = BOOTH_SIZES.find((sz) => sz.value === e.target.value);
                                      updateExhibitorBooth(booth.id, {
                                        size: e.target.value as any,
                                        width: s?.width || booth.width,
                                        depth: s?.depth || booth.depth,
                                      });
                                    }}
                                    className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                                  >
                                    {BOOTH_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                  </select>
                                  {booth.size === 'custom' && (
                                    <div className="flex gap-1 mt-1">
                                      <input type="number" min="1" value={booth.width} onChange={(e) => updateExhibitorBooth(booth.id, { width: +e.target.value })} className="w-12 rounded border border-gray-200 px-1 py-0.5 text-[10px]" title="Width" />
                                      <span className="text-[10px] text-gray-400 self-center">&times;</span>
                                      <input type="number" min="1" value={booth.depth} onChange={(e) => updateExhibitorBooth(booth.id, { depth: +e.target.value })} className="w-12 rounded border border-gray-200 px-1 py-0.5 text-[10px]" title="Depth" />
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <input type="number" step="0.01" min="0" value={booth.price} onChange={(e) => updateExhibitorBooth(booth.id, { price: +e.target.value })} className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs" />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={booth.status}
                                    onChange={(e) => updateExhibitorBooth(booth.id, { status: e.target.value as any })}
                                    className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
                                      booth.status === 'available' ? 'border-green-300 bg-green-50 text-green-700' :
                                      booth.status === 'reserved' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                                      'border-blue-300 bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    <option value="available">Available</option>
                                    <option value="reserved">Reserved</option>
                                    <option value="sold">Sold</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={booth.assignedTo} onChange={(e) => updateExhibitorBooth(booth.id, { assignedTo: e.target.value })} className="w-28 rounded border border-gray-200 px-1.5 py-0.5 text-xs" placeholder="Company" />
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-[10px] text-gray-400">{booth.amenities.length} items</span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button type="button" onClick={() => removeExhibitorBooth(booth.id)} className="text-red-400 hover:text-red-600">&times;</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex gap-4">
                        <span className="text-green-600">{form.exhibitorBooths.filter((b) => b.status === 'available').length} available</span>
                        <span className="text-amber-600">{form.exhibitorBooths.filter((b) => b.status === 'reserved').length} reserved</span>
                        <span className="text-blue-600">{form.exhibitorBooths.filter((b) => b.status === 'sold').length} sold</span>
                      </div>
                      <span>Revenue potential: ${form.exhibitorBooths.reduce((sum, b) => sum + b.price, 0).toLocaleString()}</span>
                    </div>
                  </>
                )}

                {/* Booth Amenity Editor (expand single booth) */}
                {form.exhibitorBooths.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase">Booth Amenity Defaults</p>
                    <p className="text-[10px] text-gray-400 mb-2">Click amenities to toggle them as defaults for new booths. Edit individual booth amenities in the table above.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.exhibitorAmenityOptions.map((a) => (
                        <span key={a} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">{a}</span>
                      ))}
                      <input
                        type="text"
                        className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[10px] w-32 focus:border-blue-400 focus:outline-none"
                        placeholder="+ Custom amenity"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val && !form.exhibitorAmenityOptions.includes(val)) {
                              set({ exhibitorAmenityOptions: [...form.exhibitorAmenityOptions, val] });
                            }
                            input.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Exhibitor Ticket Types */}
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Exhibitor Ticket Types</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Create ticket packages that include a booth reservation, like reserved seating tickets</p>
                  </div>
                  <button type="button" onClick={addExhibitorTicket} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    Add Exhibitor Package
                  </button>
                </div>

                {form.exhibitorTicketTypes.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
                    <p className="text-xs text-gray-400">No exhibitor ticket types. Create a package that bundles booth access with perks.</p>
                    <button type="button" onClick={addExhibitorTicket} className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                      Create first exhibitor package
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.exhibitorTicketTypes.map((ticket, tidx) => (
                      <div key={ticket.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-800">Package #{tidx + 1}</h3>
                          <button type="button" onClick={() => removeExhibitorTicket(ticket.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className={smallLabelCls}>Package Name *</label>
                            <input type="text" value={ticket.name} onChange={(e) => updateExhibitorTicket(ticket.id, { name: e.target.value })} className={inputCls} placeholder="e.g. Standard Exhibitor Booth" />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Price ($)</label>
                            <input type="number" step="0.01" min="0" value={ticket.price} onChange={(e) => updateExhibitorTicket(ticket.id, { price: +e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Available Qty</label>
                            <input type="number" min="0" value={ticket.quantity} onChange={(e) => updateExhibitorTicket(ticket.id, { quantity: +e.target.value })} className={inputCls} />
                            <p className="text-[9px] text-gray-400 mt-0.5">0 = limited by booth inventory</p>
                          </div>
                          <div className="col-span-3">
                            <label className={smallLabelCls}>Description</label>
                            <textarea value={ticket.description} onChange={(e) => updateExhibitorTicket(ticket.id, { description: e.target.value })} rows={2} className={inputCls} placeholder="What's included with this exhibitor package" />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Included Booth Size</label>
                            <select value={ticket.includesBoothSize} onChange={(e) => updateExhibitorTicket(ticket.id, { includesBoothSize: e.target.value })} className={inputCls}>
                              {BOOTH_SIZES.filter((s) => s.value !== 'custom').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              {form.exhibitorBooths.filter((b) => b.size === ticket.includesBoothSize && b.status === 'available').length} of this size available
                            </p>
                          </div>
                          <div>
                            <label className={smallLabelCls}>Sale Start</label>
                            <input type="datetime-local" value={ticket.saleStart} onChange={(e) => updateExhibitorTicket(ticket.id, { saleStart: e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={smallLabelCls}>Sale End</label>
                            <input type="datetime-local" value={ticket.saleEnd} onChange={(e) => updateExhibitorTicket(ticket.id, { saleEnd: e.target.value })} className={inputCls} />
                          </div>
                        </div>

                        {/* Perks */}
                        <div className="border-t border-gray-100 pt-3">
                          <label className={smallLabelCls}>Included Perks</label>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {EXHIBITOR_PERKS.map((perk) => (
                              <button
                                key={perk}
                                type="button"
                                onClick={() => toggleExhibitorPerk(ticket.id, perk)}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                                  ticket.perksIncluded.includes(perk)
                                    ? 'border-green-300 bg-green-50 text-green-700'
                                    : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {ticket.perksIncluded.includes(perk) ? '\u2713 ' : ''}{perk}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SPONSORS TAB ── */}
      {activeTab === 'sponsors' && (
        <div className="space-y-6">

          {/* ─── Sponsorship Tiers / Packages ─── */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sponsorship Tiers</h2>
                <p className="text-xs text-gray-400 mt-0.5">Define your sponsorship packages, pricing, and included benefits</p>
              </div>
              <button type="button" onClick={addTier} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                + Add Tier
              </button>
            </div>

            {form.sponsorTiers.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
                <p className="text-xs text-gray-400">No tiers configured.</p>
                <button type="button" onClick={() => set({ sponsorTiers: DEFAULT_SPONSOR_TIERS.map((t) => ({ ...t })) })} className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                  Load default tiers
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {form.sponsorTiers.map((tier, tidx) => (
                  <div key={tier.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                        <span className="text-sm font-medium text-gray-900">{tier.name || 'Untitled Tier'}</span>
                        <span className="text-[10px] text-gray-400">{tier.price > 0 ? `$${tier.price.toLocaleString()}` : 'Free'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => moveTier(tier.id, -1)} disabled={tidx === 0} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">&uarr;</button>
                        <button type="button" onClick={() => moveTier(tier.id, 1)} disabled={tidx === form.sponsorTiers.length - 1} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">&darr;</button>
                        <button type="button" onClick={() => removeTier(tier.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 mb-3">
                      <div>
                        <label className={smallLabelCls}>Name *</label>
                        <input type="text" value={tier.name} onChange={(e) => updateTier(tier.id, { name: e.target.value })} className={inputCls} placeholder="e.g. Gold" />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Color</label>
                        <input type="color" value={tier.color} onChange={(e) => updateTier(tier.id, { color: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Price ($)</label>
                        <input type="number" step="0.01" min="0" value={tier.price} onChange={(e) => updateTier(tier.id, { price: +e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Max Sponsors</label>
                        <input type="number" min="0" value={tier.maxSponsors} onChange={(e) => updateTier(tier.id, { maxSponsors: +e.target.value })} className={inputCls} />
                        <p className="text-[9px] text-gray-400 mt-0.5">0 = unlimited</p>
                      </div>
                      <div>
                        <label className={smallLabelCls}>Assigned</label>
                        <p className="text-sm text-gray-700 py-2">{form.sponsors.filter((s) => s.tierId === tier.id).length}{tier.maxSponsors > 0 ? ` / ${tier.maxSponsors}` : ''}</p>
                      </div>
                    </div>

                    {/* Tier Benefits */}
                    <div>
                      <label className={smallLabelCls}>Included Benefits</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.sponsorBenefitOptions.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => toggleTierBenefit(tier.id, b)}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                              tier.benefits.includes(b)
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            {tier.benefits.includes(b) ? '\u2713 ' : ''}{b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Benefit Options */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <label className={smallLabelCls}>Available Benefits</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    id="newBenefitInput"
                    className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    placeholder="Add custom benefit..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        addBenefitOption(input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newBenefitInput') as HTMLInputElement;
                      if (input?.value) { addBenefitOption(input.value); input.value = ''; }
                    }}
                    className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.sponsorBenefitOptions.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                    {b}
                    <button type="button" onClick={() => removeBenefitOption(b)} className="text-gray-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Sponsors List ─── */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sponsors</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add and manage individual sponsors</p>
              </div>
              <div className="flex items-center gap-2">
                {form.sponsors.length > 0 && (
                  <span className="text-xs text-gray-400">Total: <span className="font-medium text-gray-700">${form.sponsors.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}</span></span>
                )}
                <button type="button" onClick={() => addSponsor()} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  Add Sponsor
                </button>
              </div>
            </div>

            {form.sponsors.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm text-gray-400">No sponsors yet.</p>
                {form.sponsorTiers.length > 0 && (
                  <div className="mt-3 flex justify-center gap-2">
                    {form.sponsorTiers.slice(0, 4).map((tier) => (
                      <button key={tier.id} type="button" onClick={() => addSponsor(tier.id)}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                        style={{ borderColor: tier.color, color: tier.color }}
                      >
                        + {tier.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {form.sponsors.map((sponsor, idx) => {
                  const tier = form.sponsorTiers.find((t) => t.id === sponsor.tierId);
                  return (
                    <div key={sponsor.id} className="rounded-lg border-2 p-4" style={{ borderColor: tier?.color || '#e5e7eb' }}>
                      {/* Sponsor Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {sponsor.logo && <img src={sponsor.logo} alt="" className="h-6 w-6 rounded object-contain bg-white" />}
                          <h3 className="text-sm font-semibold text-gray-900">{sponsor.name || `Sponsor #${idx + 1}`}</h3>
                          {tier && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${tier.color}20`, color: tier.color }}>
                              {tier.name}
                            </span>
                          )}
                          {sponsor.featured && <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-[9px] font-bold text-yellow-800">FEATURED</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => moveSponsor(sponsor.id, -1)} disabled={idx === 0} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">&uarr;</button>
                          <button type="button" onClick={() => moveSponsor(sponsor.id, 1)} disabled={idx === form.sponsors.length - 1} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">&darr;</button>
                          <button type="button" onClick={() => removeSponsor(sponsor.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      </div>

                      {/* Company Details */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className={smallLabelCls}>Company Name *</label>
                          <input type="text" value={sponsor.name} onChange={(e) => updateSponsor(sponsor.id, { name: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabelCls}>Tier</label>
                          <select value={sponsor.tierId} onChange={(e) => assignTierToSponsor(sponsor.id, e.target.value)} className={inputCls}>
                            <option value="">No tier</option>
                            {form.sponsorTiers.map((t) => <option key={t.id} value={t.id}>{t.name} (${t.price.toLocaleString()})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={smallLabelCls}>Amount ($)</label>
                          <input type="number" step="0.01" min="0" value={sponsor.amount} onChange={(e) => updateSponsor(sponsor.id, { amount: +e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabelCls}>Website</label>
                          <input type="url" value={sponsor.website} onChange={(e) => updateSponsor(sponsor.id, { website: e.target.value })} className={inputCls} placeholder="https://..." />
                        </div>
                        <div>
                          <label className={smallLabelCls}>Contact Name</label>
                          <input type="text" value={sponsor.contactName} onChange={(e) => updateSponsor(sponsor.id, { contactName: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabelCls}>Contact Email</label>
                          <input type="email" value={sponsor.contactEmail} onChange={(e) => updateSponsor(sponsor.id, { contactEmail: e.target.value })} className={inputCls} />
                        </div>
                        <div className="col-span-2">
                          <label className={smallLabelCls}>Description</label>
                          <textarea value={sponsor.description} onChange={(e) => updateSponsor(sponsor.id, { description: e.target.value })} rows={2} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={smallLabelCls}>Twitter</label>
                            <input type="text" value={sponsor.twitter} onChange={(e) => updateSponsor(sponsor.id, { twitter: e.target.value })} className={inputCls} placeholder="@handle" />
                          </div>
                          <div>
                            <label className={smallLabelCls}>LinkedIn</label>
                            <input type="url" value={sponsor.linkedin} onChange={(e) => updateSponsor(sponsor.id, { linkedin: e.target.value })} className={inputCls} placeholder="URL" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <MediaPicker label="Logo" value={sponsor.logo} onChange={(v) => updateSponsor(sponsor.id, { logo: v })} accept="image/*" helpText="Transparent PNG" />
                        </div>
                        <div className="col-span-2 flex items-end pb-1">
                          <label className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={sponsor.featured} onChange={(e) => updateSponsor(sponsor.id, { featured: e.target.checked })} className="rounded border-gray-300" />
                            <span className="text-gray-700">Featured sponsor (highlighted on event page)</span>
                          </label>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="border-t border-gray-100 pt-3 mb-3">
                        <label className={smallLabelCls}>Benefits</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {form.sponsorBenefitOptions.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => toggleSponsorBenefit(sponsor.id, b)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                                sponsor.benefits.includes(b)
                                  ? 'border-green-300 bg-green-50 text-green-700'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                              }`}
                            >
                              {sponsor.benefits.includes(b) ? '\u2713 ' : ''}{b}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Booth Reservation */}
                      <div className="border-t border-gray-100 pt-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <input type="checkbox" checked={sponsor.booth.reserved} onChange={(e) => updateSponsorBooth(sponsor.id, { reserved: e.target.checked })} className="rounded border-gray-300" />
                            Booth Reservation
                          </label>
                        </div>
                        {sponsor.booth.reserved && (
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className={smallLabelCls}>Booth ID / Number</label>
                              <input type="text" value={sponsor.booth.boothId} onChange={(e) => updateSponsorBooth(sponsor.id, { boothId: e.target.value })} className={inputCls} placeholder="e.g. A-12" />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Size</label>
                              <select value={sponsor.booth.size} onChange={(e) => updateSponsorBooth(sponsor.id, { size: e.target.value as any })} className={inputCls}>
                                <option value="small">Small (8&apos; &times; 8&apos;)</option>
                                <option value="medium">Medium (10&apos; &times; 10&apos;)</option>
                                <option value="large">Large (10&apos; &times; 20&apos;)</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>
                            {sponsor.booth.size === 'custom' && (
                              <>
                                <div>
                                  <label className={smallLabelCls}>Width (ft)</label>
                                  <input type="number" min="1" value={sponsor.booth.customWidth} onChange={(e) => updateSponsorBooth(sponsor.id, { customWidth: +e.target.value })} className={inputCls} />
                                </div>
                                <div>
                                  <label className={smallLabelCls}>Depth (ft)</label>
                                  <input type="number" min="1" value={sponsor.booth.customDepth} onChange={(e) => updateSponsorBooth(sponsor.id, { customDepth: +e.target.value })} className={inputCls} />
                                </div>
                              </>
                            )}
                            <div>
                              <label className={smallLabelCls}>Location</label>
                              <input type="text" value={sponsor.booth.location} onChange={(e) => updateSponsorBooth(sponsor.id, { location: e.target.value })} className={inputCls} placeholder="Hall A, Row 3" />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Tables</label>
                              <input type="number" min="0" value={sponsor.booth.tables} onChange={(e) => updateSponsorBooth(sponsor.id, { tables: +e.target.value })} className={inputCls} />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Chairs</label>
                              <input type="number" min="0" value={sponsor.booth.chairs} onChange={(e) => updateSponsorBooth(sponsor.id, { chairs: +e.target.value })} className={inputCls} />
                            </div>
                            <div className="flex items-end gap-3 pb-1">
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={sponsor.booth.power} onChange={(e) => updateSponsorBooth(sponsor.id, { power: e.target.checked })} className="rounded border-gray-300" />
                                Power
                              </label>
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={sponsor.booth.wifi} onChange={(e) => updateSponsorBooth(sponsor.id, { wifi: e.target.checked })} className="rounded border-gray-300" />
                                Wi-Fi
                              </label>
                            </div>
                            <div>
                              <label className={smallLabelCls}>Setup Date</label>
                              <input type="date" value={sponsor.booth.setupDate} onChange={(e) => updateSponsorBooth(sponsor.id, { setupDate: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Setup Time</label>
                              <input type="time" value={sponsor.booth.setupTime} onChange={(e) => updateSponsorBooth(sponsor.id, { setupTime: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Teardown Date</label>
                              <input type="date" value={sponsor.booth.teardownDate} onChange={(e) => updateSponsorBooth(sponsor.id, { teardownDate: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                              <label className={smallLabelCls}>Teardown Time</label>
                              <input type="time" value={sponsor.booth.teardownTime} onChange={(e) => updateSponsorBooth(sponsor.id, { teardownTime: e.target.value })} className={inputCls} />
                            </div>
                            <div className="col-span-4">
                              <label className={smallLabelCls}>Booth Notes</label>
                              <textarea value={sponsor.booth.notes} onChange={(e) => updateSponsorBooth(sponsor.id, { notes: e.target.value })} rows={2} className={inputCls} placeholder="Special requirements, power specs, signage needs..." />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Discount / Promo Link */}
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <input type="checkbox" checked={sponsor.discount.enabled} onChange={(e) => updateSponsorDiscount(sponsor.id, { enabled: e.target.checked })} className="rounded border-gray-300" />
                            Discounted Registration Link
                          </label>
                          {sponsor.discount.enabled && !sponsor.discount.code && (
                            <button type="button" onClick={() => generateDiscountCode(sponsor.id)} className="text-xs text-blue-600 hover:text-blue-800">
                              Generate Code
                            </button>
                          )}
                        </div>
                        {sponsor.discount.enabled && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className={smallLabelCls}>Promo Code</label>
                                <div className="flex gap-1">
                                  <input type="text" value={sponsor.discount.code} onChange={(e) => updateSponsorDiscount(sponsor.id, { code: e.target.value.toUpperCase() })} className={inputCls} placeholder="SPONSOR20" />
                                  <button type="button" onClick={() => generateDiscountCode(sponsor.id)} className="shrink-0 rounded border border-gray-300 px-2 text-xs text-gray-500 hover:bg-gray-50" title="Auto-generate">&#x21bb;</button>
                                </div>
                              </div>
                              <div>
                                <label className={smallLabelCls}>Discount Type</label>
                                <select value={sponsor.discount.type} onChange={(e) => updateSponsorDiscount(sponsor.id, { type: e.target.value as any })} className={inputCls}>
                                  <option value="percentage">Percentage (%)</option>
                                  <option value="fixed">Fixed Amount ($)</option>
                                </select>
                              </div>
                              <div>
                                <label className={smallLabelCls}>{sponsor.discount.type === 'percentage' ? 'Discount (%)' : 'Discount ($)'}</label>
                                <input type="number" step={sponsor.discount.type === 'percentage' ? '1' : '0.01'} min="0" max={sponsor.discount.type === 'percentage' ? '100' : undefined} value={sponsor.discount.amount} onChange={(e) => updateSponsorDiscount(sponsor.id, { amount: +e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Max Uses</label>
                                <input type="number" min="0" value={sponsor.discount.maxUses} onChange={(e) => updateSponsorDiscount(sponsor.id, { maxUses: +e.target.value })} className={inputCls} />
                                <p className="text-[9px] text-gray-400 mt-0.5">0 = unlimited</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={smallLabelCls}>Expiry Date</label>
                                <input type="date" value={sponsor.discount.expiryDate} onChange={(e) => updateSponsorDiscount(sponsor.id, { expiryDate: e.target.value })} className={inputCls} />
                              </div>
                              <div>
                                <label className={smallLabelCls}>Applies to Tickets</label>
                                <select
                                  multiple
                                  value={sponsor.discount.applicableTickets}
                                  onChange={(e) => {
                                    const vals = Array.from(e.target.selectedOptions, (o) => o.value);
                                    updateSponsorDiscount(sponsor.id, { applicableTickets: vals });
                                  }}
                                  className={inputCls + ' min-h-[4rem]'}
                                >
                                  {form.ticketTypes.length === 0 ? (
                                    <option disabled>No ticket types defined</option>
                                  ) : (
                                    form.ticketTypes.map((t) => (
                                      <option key={t.id} value={t.id}>{t.name} {t.price > 0 ? `($${t.price})` : '(Free)'}</option>
                                    ))
                                  )}
                                </select>
                                <p className="text-[9px] text-gray-400 mt-0.5">Leave empty for all tickets. Hold Ctrl to multi-select.</p>
                              </div>
                            </div>

                            {/* Shareable Link Preview */}
                            {sponsor.discount.code && (
                              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                                <p className="text-[10px] font-medium text-blue-700 mb-1">Shareable Registration Link</p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 rounded bg-white border border-blue-200 px-3 py-1.5 text-xs text-blue-800 font-mono truncate">
                                    {`yoursite.com/events/${form.slug || autoSlug(form.title) || 'event'}?promo=${sponsor.discount.code}`}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `yoursite.com/events/${form.slug || autoSlug(form.title) || 'event'}?promo=${sponsor.discount.code}`;
                                      navigator.clipboard?.writeText(url);
                                    }}
                                    className="shrink-0 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <p className="text-[9px] text-blue-600 mt-1.5">
                                  {sponsor.discount.type === 'percentage' ? `${sponsor.discount.amount}% off` : `$${sponsor.discount.amount} off`}
                                  {sponsor.discount.maxUses > 0 ? ` \u2022 ${sponsor.discount.maxUses} uses` : ' \u2022 Unlimited uses'}
                                  {sponsor.discount.expiryDate ? ` \u2022 Expires ${sponsor.discount.expiryDate}` : ''}
                                  {sponsor.discount.applicableTickets.length > 0 ? ` \u2022 ${sponsor.discount.applicableTickets.length} ticket type(s)` : ' \u2022 All tickets'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Booth Map ─── */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Booth Floor Plan</h2>
            <MediaPicker
              label="Booth Map / Floor Plan"
              value={form.boothMapImage}
              onChange={(v) => set({ boothMapImage: v })}
              accept="image/*"
              helpText="Upload a floor plan showing booth locations. Sponsors can reference this when setting up."
            />
            {form.sponsors.filter((s) => s.booth.reserved).length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Booth Assignments</h3>
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Sponsor</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Booth</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Size</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Location</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Amenities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.sponsors.filter((s) => s.booth.reserved).map((s) => {
                        const sizeLabel = s.booth.size === 'custom'
                          ? `${s.booth.customWidth}' \u00d7 ${s.booth.customDepth}'`
                          : s.booth.size === 'small' ? "8' \u00d7 8'" : s.booth.size === 'medium' ? "10' \u00d7 10'" : "10' \u00d7 20'";
                        return (
                          <tr key={s.id} className="border-b border-gray-100">
                            <td className="px-3 py-2 font-medium text-gray-900">{s.name || 'Unnamed'}</td>
                            <td className="px-3 py-2 text-gray-600">{s.booth.boothId || '\u2014'}</td>
                            <td className="px-3 py-2 text-gray-600">{sizeLabel}</td>
                            <td className="px-3 py-2 text-gray-600">{s.booth.location || '\u2014'}</td>
                            <td className="px-3 py-2 text-gray-500">
                              {[s.booth.power && 'Power', s.booth.wifi && 'Wi-Fi', s.booth.tables > 0 && `${s.booth.tables}T`, s.booth.chairs > 0 && `${s.booth.chairs}C`].filter(Boolean).join(', ') || '\u2014'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BADGES TAB ── */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Badge Design */}
            <div className="col-span-2 space-y-4">
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">Badge Design</h2>

                {/* Size */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className={smallLabelCls}>Preset Size</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const s = BADGE_SIZES.find((b) => b.label === e.target.value);
                        if (s) setBadge({ width: s.width, height: s.height, unit: s.width > 10 ? 'mm' : 'in' });
                      }}
                      className={inputCls}
                    >
                      <option value="">Custom</option>
                      {BADGE_SIZES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={smallLabelCls}>Width</label>
                    <input type="number" step="0.1" min="1" value={form.badgeTemplate.width} onChange={(e) => setBadge({ width: +e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={smallLabelCls}>Height</label>
                    <input type="number" step="0.1" min="1" value={form.badgeTemplate.height} onChange={(e) => setBadge({ height: +e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={smallLabelCls}>Orientation</label>
                    <select value={form.badgeTemplate.orientation} onChange={(e) => setBadge({ orientation: e.target.value as any })} className={inputCls}>
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className={smallLabelCls}>Background</label>
                    <input type="color" value={form.badgeTemplate.backgroundColor} onChange={(e) => setBadge({ backgroundColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
                  </div>
                  <div>
                    <label className={smallLabelCls}>Name Color</label>
                    <input type="color" value={form.badgeTemplate.nameColor} onChange={(e) => setBadge({ nameColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
                  </div>
                  <div>
                    <label className={smallLabelCls}>Border Color</label>
                    <input type="color" value={form.badgeTemplate.borderColor} onChange={(e) => setBadge({ borderColor: e.target.value })} className="h-9 w-full rounded border border-gray-300 cursor-pointer" />
                  </div>
                  <div>
                    <label className={smallLabelCls}>Border Width</label>
                    <input type="number" min="0" max="10" value={form.badgeTemplate.borderWidth} onChange={(e) => setBadge({ borderWidth: +e.target.value })} className={inputCls} />
                  </div>
                </div>

                {/* Name Size */}
                <div className="mb-4">
                  <label className={smallLabelCls}>Name Font Size: {form.badgeTemplate.nameSize}px</label>
                  <input type="range" min="12" max="48" value={form.badgeTemplate.nameSize} onChange={(e) => setBadge({ nameSize: +e.target.value })} className="w-full" />
                </div>

                {/* Toggle fields */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {([
                    { key: 'showLogo' as const, label: 'Show Logo' },
                    { key: 'showName' as const, label: 'Show Name' },
                    { key: 'showEmail' as const, label: 'Show Email' },
                    { key: 'showCompany' as const, label: 'Show Company' },
                    { key: 'showTicketType' as const, label: 'Show Ticket Type' },
                    { key: 'showQrCode' as const, label: 'Show QR Code' },
                    { key: 'showPhoto' as const, label: 'Show Photo' },
                  ]).map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={form.badgeTemplate[opt.key]}
                        onChange={(e) => setBadge({ [opt.key]: e.target.checked } as any)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {form.badgeTemplate.showLogo && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <MediaPicker label="Logo Image" value={form.badgeTemplate.logoImage} onChange={(v) => setBadge({ logoImage: v })} accept="image/*" />
                    <div>
                      <label className={smallLabelCls}>Logo Position</label>
                      <select value={form.badgeTemplate.logoPosition} onChange={(e) => setBadge({ logoPosition: e.target.value as any })} className={inputCls}>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <MediaPicker label="Background Image" value={form.badgeTemplate.backgroundImage} onChange={(v) => setBadge({ backgroundImage: v })} accept="image/*" helpText="Optional background image" />
                </div>

                <div>
                  <label className={smallLabelCls}>Custom Text (e.g. WiFi password, hashtag)</label>
                  <input type="text" value={form.badgeTemplate.customText} onChange={(e) => setBadge({ customText: e.target.value })} className={inputCls} placeholder="#EventHashtag" />
                </div>
              </div>
            </div>

            {/* Badge Preview */}
            <div className="space-y-4">
              <div className="rounded-lg bg-white p-5 shadow">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">Preview</h2>
                <div className="flex justify-center">
                  <div
                    style={{
                      width: badgePreviewW * badgeScaleFactor,
                      height: badgePreviewH * badgeScaleFactor,
                      backgroundColor: form.badgeTemplate.backgroundColor,
                      borderWidth: form.badgeTemplate.borderWidth,
                      borderColor: form.badgeTemplate.borderColor,
                      borderStyle: 'solid',
                      backgroundImage: form.badgeTemplate.backgroundImage ? `url(${form.badgeTemplate.backgroundImage})` : undefined,
                      backgroundSize: 'cover',
                    }}
                    className="rounded-lg shadow-lg flex flex-col items-center justify-center p-4 relative overflow-hidden"
                  >
                    {form.badgeTemplate.showLogo && form.badgeTemplate.logoImage && form.badgeTemplate.logoPosition === 'top' && (
                      <img src={form.badgeTemplate.logoImage} alt="Logo" className="h-8 mb-2 object-contain" />
                    )}
                    {form.badgeTemplate.showName && (
                      <p style={{ fontSize: form.badgeTemplate.nameSize * badgeScaleFactor, color: form.badgeTemplate.nameColor }} className="font-bold text-center">
                        Jane Smith
                      </p>
                    )}
                    {form.badgeTemplate.showCompany && (
                      <p className="text-xs text-gray-500 mt-0.5">Acme Corporation</p>
                    )}
                    {form.badgeTemplate.showEmail && (
                      <p className="text-[10px] text-gray-400 mt-0.5">jane@example.com</p>
                    )}
                    {form.badgeTemplate.showTicketType && (
                      <span className="mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                        VIP Pass
                      </span>
                    )}
                    {form.badgeTemplate.showQrCode && (
                      <div className="mt-2 h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-400">
                        QR
                      </div>
                    )}
                    {form.badgeTemplate.customText && (
                      <p className="absolute bottom-2 text-[9px] text-gray-400">{form.badgeTemplate.customText}</p>
                    )}
                    {form.badgeTemplate.showLogo && form.badgeTemplate.logoImage && form.badgeTemplate.logoPosition === 'bottom' && (
                      <img src={form.badgeTemplate.logoImage} alt="Logo" className="h-8 mt-2 object-contain" />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-center text-[10px] text-gray-400">
                  {form.badgeTemplate.width}{form.badgeTemplate.unit === 'mm' ? 'mm' : '"'} &times; {form.badgeTemplate.height}{form.badgeTemplate.unit === 'mm' ? 'mm' : '"'} ({form.badgeTemplate.orientation})
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Printing</h3>
                <p className="text-[10px] text-gray-500 mb-2">Badge printing with attendee data is available after the event is saved. Use the Badges sub-page to select attendees and generate printable badges.</p>
                {isEdit && (
                  <Link href={`/events/${initialData?.slug || ''}/badges`} className="text-xs text-blue-600 hover:text-blue-800">
                    Go to Badge Printing &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTRATION TAB ── */}
      {activeTab === 'registration' && (
        <div className="space-y-6">
          {/* Custom Registration Fields */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Custom Registration Fields</h2>
                <p className="text-xs text-gray-400 mt-0.5">Name and email are always collected. Add additional fields here.</p>
              </div>
              <button type="button" onClick={addRegField} className="text-xs text-blue-600 hover:text-blue-800">+ Add Field</button>
            </div>
            {form.registrationFields.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No custom fields.</p>
            ) : (
              <div className="space-y-2">
                {form.registrationFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <div>
                        <label className={smallLabelCls}>Label</label>
                        <input type="text" value={field.label} onChange={(e) => updateRegField(field.id, { label: e.target.value })} className={inputCls} placeholder="Field label" />
                      </div>
                      <div>
                        <label className={smallLabelCls}>Type</label>
                        <select value={field.type} onChange={(e) => updateRegField(field.id, { type: e.target.value as any })} className={inputCls}>
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="select">Dropdown</option>
                          <option value="textarea">Textarea</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      {field.type === 'select' && (
                        <div>
                          <label className={smallLabelCls}>Options (comma-sep)</label>
                          <input type="text" value={field.options} onChange={(e) => updateRegField(field.id, { options: e.target.value })} className={inputCls} placeholder="Option 1, Option 2" />
                        </div>
                      )}
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={field.required} onChange={(e) => updateRegField(field.id, { required: e.target.checked })} className="rounded border-gray-300" />
                          Required
                        </label>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeRegField(field.id)} className="text-red-400 hover:text-red-600">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Notifications */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Notification Emails</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Confirmation Email Template</label>
                <textarea value={form.confirmationEmail} onChange={(e) => set({ confirmationEmail: e.target.value })} rows={4} className={inputCls} placeholder="Email content sent after registration. Use {{name}}, {{event}}, {{date}}, {{ticket}}" />
              </div>
              <div>
                <label className={labelCls}>Reminder Email Template</label>
                <textarea value={form.reminderEmail} onChange={(e) => set({ reminderEmail: e.target.value })} rows={4} className={inputCls} placeholder="Email content sent before the event. Use {{name}}, {{event}}, {{date}}, {{venue}}" />
              </div>
              <div className="w-48">
                <label className={labelCls}>Send Reminder Hours Before</label>
                <input type="number" min="1" value={form.reminderHoursBefore} onChange={(e) => set({ reminderHoursBefore: +e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEO TAB ── */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* General SEO */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Search Engine Optimization</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>SEO Title</label>
                <input type="text" value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} className={inputCls} placeholder="Title for search engines" />
                <p className={`mt-0.5 text-[10px] ${form.seoTitle.length > 60 ? 'text-red-400' : 'text-gray-400'}`}>{form.seoTitle.length}/60 characters</p>
              </div>
              <div>
                <label className={labelCls}>SEO Description</label>
                <textarea value={form.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} rows={3} className={inputCls} placeholder="Meta description" />
                <p className={`mt-0.5 text-[10px] ${form.seoDescription.length > 160 ? 'text-red-400' : 'text-gray-400'}`}>{form.seoDescription.length}/160 characters</p>
              </div>
              <div>
                <label className={labelCls}>Keywords</label>
                <input type="text" value={form.seoKeywords} onChange={(e) => set({ seoKeywords: e.target.value })} className={inputCls} placeholder="Comma-separated keywords" />
              </div>
              <MediaPicker label="Default OG Image" value={form.seoOgImage} onChange={(v) => set({ seoOgImage: v })} accept="image/*" helpText="Default image for social sharing (1200x630)" />
            </div>

            {/* Google Preview */}
            <div className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-xs font-semibold text-gray-700">Google Search Preview</h3>
              <div className="max-w-lg">
                <p className="text-sm text-blue-800 font-medium truncate">{form.seoTitle || form.title || 'Event Title'}</p>
                <p className="text-xs text-green-700 truncate">yoursite.com/events/{form.slug || autoSlug(form.title) || 'event-slug'}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.seoDescription || form.shortDescription || form.description || 'Event description will appear here...'}</p>
              </div>
            </div>
          </div>

          {/* Twitter Card */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Twitter / X Card</h2>
              <p className="text-[10px] text-gray-400">Falls back to default OG values if left empty</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Card Type</label>
                  <select value={form.seoTwitterCard} onChange={(e) => set({ seoTwitterCard: e.target.value as any })} className={inputCls}>
                    <option value="summary_large_image">Large Image</option>
                    <option value="summary">Summary (small image)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Title</label>
                  <input type="text" value={form.seoTwitterTitle} onChange={(e) => set({ seoTwitterTitle: e.target.value })} className={inputCls} placeholder={form.seoTitle || form.title || 'Uses SEO title'} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={form.seoTwitterDescription} onChange={(e) => set({ seoTwitterDescription: e.target.value })} rows={2} className={inputCls} placeholder={form.seoDescription || 'Uses SEO description'} />
                </div>
                <MediaPicker label="Twitter Image" value={form.seoTwitterImage} onChange={(v) => set({ seoTwitterImage: v })} accept="image/*" helpText="Recommended 1200x628 for large image cards" />
              </div>
              {/* Twitter Preview */}
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-2">Preview</p>
                <div className="rounded-xl border border-gray-200 overflow-hidden max-w-sm">
                  {form.seoTwitterCard === 'summary_large_image' ? (
                    <>
                      <div className="h-40 bg-gray-100 flex items-center justify-center">
                        {(form.seoTwitterImage || form.seoOgImage || form.image) ? (
                          <img src={form.seoTwitterImage || form.seoOgImage || form.image} alt="" className="w-full h-40 object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">1200 x 628</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{form.seoTwitterTitle || form.seoTitle || form.title || 'Event Title'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.seoTwitterDescription || form.seoDescription || form.shortDescription || 'Event description...'}</p>
                        <p className="text-xs text-gray-400 mt-1">yoursite.com</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex p-3 gap-3">
                      <div className="h-20 w-20 shrink-0 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                        {(form.seoTwitterImage || form.seoOgImage || form.image) ? (
                          <img src={form.seoTwitterImage || form.seoOgImage || form.image} alt="" className="h-20 w-20 object-cover" />
                        ) : (
                          <span className="text-[8px] text-gray-400">Image</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{form.seoTwitterTitle || form.seoTitle || form.title || 'Event Title'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.seoTwitterDescription || form.seoDescription || form.shortDescription || 'Event description...'}</p>
                        <p className="text-xs text-gray-400 mt-1">yoursite.com</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facebook / Open Graph */}
          <div className="rounded-lg bg-white p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Facebook / Open Graph</h2>
              <p className="text-[10px] text-gray-400">Falls back to default OG values if left empty</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Title</label>
                  <input type="text" value={form.seoFacebookTitle} onChange={(e) => set({ seoFacebookTitle: e.target.value })} className={inputCls} placeholder={form.seoTitle || form.title || 'Uses SEO title'} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={form.seoFacebookDescription} onChange={(e) => set({ seoFacebookDescription: e.target.value })} rows={2} className={inputCls} placeholder={form.seoDescription || 'Uses SEO description'} />
                </div>
                <MediaPicker label="Facebook Image" value={form.seoFacebookImage} onChange={(v) => set({ seoFacebookImage: v })} accept="image/*" helpText="Recommended 1200x630" />
              </div>
              {/* Facebook Preview */}
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-2">Preview</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden max-w-sm">
                  <div className="h-44 bg-gray-100 flex items-center justify-center">
                    {(form.seoFacebookImage || form.seoOgImage || form.image) ? (
                      <img src={form.seoFacebookImage || form.seoOgImage || form.image} alt="" className="w-full h-44 object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">1200 x 630</span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 border-t border-gray-200">
                    <p className="text-[10px] uppercase text-gray-400">yoursite.com</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{form.seoFacebookTitle || form.seoTitle || form.title || 'Event Title'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.seoFacebookDescription || form.seoDescription || form.shortDescription || 'Event description...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center gap-3 rounded-lg bg-white p-4 shadow sticky bottom-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </button>
        <Link href="/events" className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
          Cancel
        </Link>
        {isEdit && (
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
            <Link href={`/events/${initialData?.slug || ''}/sessions`} className="text-blue-500 hover:text-blue-700">Sessions</Link>
            <Link href={`/events/${initialData?.slug || ''}/sponsors`} className="text-blue-500 hover:text-blue-700">Sponsors</Link>
            <Link href={`/events/${initialData?.slug || ''}/surveys`} className="text-blue-500 hover:text-blue-700">Surveys</Link>
            <Link href={`/events/${initialData?.slug || ''}/attendees`} className="text-blue-500 hover:text-blue-700">Attendees</Link>
            <Link href={`/events/${initialData?.slug || ''}/badges`} className="text-blue-500 hover:text-blue-700">Badges</Link>
          </div>
        )}
      </div>
    </form>
  );
}
