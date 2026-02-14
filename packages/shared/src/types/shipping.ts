export interface ShippingRate {
  carrier: string;
  service: string;
  serviceCode: string;
  totalCharge: number; // cents
  currency: string;
  estimatedDelivery: string | null;
  estimatedBusinessDays: number | null;
  guaranteedDelivery: boolean;
  saturdayDelivery: boolean;
}

export interface ShippingRateRequest {
  shipFrom: {
    postalCode: string;
    country: string;
    warehouseId: string;
  };
  shipTo: {
    postalCode: string;
    state: string;
    country: string;
  };
  packages: ShippingPackage[];
}

export interface ShippingPackage {
  weight: { value: number; unit: string };
  dimensions: { length: number; width: number; height: number; unit: string };
}

export interface ShippingRateResponse {
  shipFrom: ShippingRateRequest['shipFrom'];
  shipTo: ShippingRateRequest['shipTo'];
  packages: ShippingPackage[];
  rates: ShippingRate[];
  cached: boolean;
}

export interface ICarrierAdapter {
  readonly carrierName: string;

  getRates(request: ShippingRateRequest): Promise<ShippingRate[]>;

  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;

  getTracking(trackingNumber: string): Promise<TrackingResult>;

  validateAddress(address: AddressValidationRequest): Promise<AddressValidationResult>;
}

export interface CreateShipmentParams {
  shipFrom: ShippingRateRequest['shipFrom'] & {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
  };
  shipTo: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  packages: ShippingPackage[];
  serviceCode: string;
  labelFormat: 'PDF' | 'ZPL' | 'PNG';
}

export interface ShipmentResult {
  trackingNumber: string;
  labelUrl: string;
  labelFormat: string;
  estimatedDelivery: string | null;
}

export interface TrackingEvent {
  timestamp: string;
  status: 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  description: string;
  location: string | null;
}

export interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  status: TrackingEvent['status'];
  estimatedDelivery: string | null;
  events: TrackingEvent[];
}

export interface AddressValidationRequest {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AddressValidationResult {
  valid: boolean;
  corrected: AddressValidationRequest | null;
  suggestions: AddressValidationRequest[];
  isPOBox: boolean;
}
