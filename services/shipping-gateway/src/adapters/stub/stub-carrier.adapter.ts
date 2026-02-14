import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  ICarrierAdapter,
  ShippingRateRequest,
  ShippingRate,
  CreateShipmentParams,
  ShipmentResult,
  TrackingResult,
  TrackingEvent,
  AddressValidationRequest,
  AddressValidationResult,
} from '@agora-cms/shared';

/**
 * Stub carrier adapter for local development.
 * Returns hardcoded realistic rates for a generic carrier.
 */
@Injectable()
export class StubCarrierAdapter implements ICarrierAdapter {
  readonly carrierName = 'StubCarrier';
  private readonly logger = new Logger(StubCarrierAdapter.name);

  private delay(min = 50, max = 200): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Returns 3 rates: Ground (~$12), Express (~$24), Overnight (~$45).
   * Prices vary slightly based on package weight for realism.
   */
  async getRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    await this.delay();

    const totalWeight = request.packages.reduce(
      (sum, pkg) => sum + pkg.weight.value,
      0,
    );
    const weightMultiplier = Math.max(1, totalWeight / 5); // base rate per 5 lbs

    this.logger.log(
      `[STUB] Getting rates for ${request.packages.length} package(s), ` +
        `${totalWeight} lbs total, ${request.shipFrom.postalCode} -> ${request.shipTo.postalCode}`,
    );

    const today = new Date();

    return [
      {
        carrier: this.carrierName,
        service: 'Ground Shipping',
        serviceCode: 'STUB_GROUND',
        totalCharge: Math.round(1199 * weightMultiplier), // ~$11.99 base
        currency: 'USD',
        estimatedDelivery: new Date(
          today.getTime() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedBusinessDays: 5,
        guaranteedDelivery: false,
        saturdayDelivery: false,
      },
      {
        carrier: this.carrierName,
        service: 'Express Shipping',
        serviceCode: 'STUB_EXPRESS',
        totalCharge: Math.round(2399 * weightMultiplier), // ~$23.99 base
        currency: 'USD',
        estimatedDelivery: new Date(
          today.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedBusinessDays: 2,
        guaranteedDelivery: true,
        saturdayDelivery: false,
      },
      {
        carrier: this.carrierName,
        service: 'Overnight Shipping',
        serviceCode: 'STUB_OVERNIGHT',
        totalCharge: Math.round(4499 * weightMultiplier), // ~$44.99 base
        currency: 'USD',
        estimatedDelivery: new Date(
          today.getTime() + 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedBusinessDays: 1,
        guaranteedDelivery: true,
        saturdayDelivery: true,
      },
    ];
  }

  /**
   * Returns a mock shipment with tracking number and label URL.
   */
  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    await this.delay(100, 300);

    const trackingNumber = `STUB${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    this.logger.log(
      `[STUB] Created shipment ${trackingNumber} (${params.serviceCode}) ` +
        `from ${params.shipFrom.postalCode} to ${params.shipTo.postalCode}`,
    );

    const today = new Date();
    const deliveryDays =
      params.serviceCode === 'STUB_OVERNIGHT'
        ? 1
        : params.serviceCode === 'STUB_EXPRESS'
          ? 2
          : 5;

    return {
      trackingNumber,
      labelUrl: `https://labels.stub-carrier.local/${trackingNumber}.${params.labelFormat.toLowerCase()}`,
      labelFormat: params.labelFormat,
      estimatedDelivery: new Date(
        today.getTime() + deliveryDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }

  /**
   * Returns mock tracking events showing typical package progression.
   */
  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    await this.delay();

    const now = new Date();

    const events: TrackingEvent[] = [
      {
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'label_created',
        description: 'Shipping label created',
        location: 'Columbus, OH 43215',
      },
      {
        timestamp: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'picked_up',
        description: 'Package picked up by carrier',
        location: 'Columbus, OH 43215',
      },
      {
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_transit',
        description: 'Package departed facility',
        location: 'Columbus, OH 43215',
      },
      {
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_transit',
        description: 'Package arrived at regional hub',
        location: 'Chicago, IL 60601',
      },
      {
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'out_for_delivery',
        description: 'Package out for delivery',
        location: 'Destination City',
      },
    ];

    this.logger.log(`[STUB] Retrieved tracking for ${trackingNumber}`);

    return {
      trackingNumber,
      carrier: this.carrierName,
      status: 'out_for_delivery',
      estimatedDelivery: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      events,
    };
  }

  /**
   * Returns valid=true with the same address passed in.
   */
  async validateAddress(
    address: AddressValidationRequest,
  ): Promise<AddressValidationResult> {
    await this.delay();

    this.logger.log(
      `[STUB] Validated address: ${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`,
    );

    return {
      valid: true,
      corrected: null,
      suggestions: [],
      isPOBox: address.line1.toLowerCase().includes('po box'),
    };
  }
}
