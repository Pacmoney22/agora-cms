import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { type Address } from '@agora-cms/shared';

interface TaxSettings {
  enabled: boolean;
  calculationMethod: 'manual' | 'stripe' | 'automatic';
  defaultRate: string;
  taxShipping: boolean;
  stripeProductTaxCode?: string;
  rates: Array<{
    rate: string;
    country: string;
    state: string;
    postalCodes: string;
    priority: number;
    compound: boolean;
    shipping: boolean;
  }>;
}

interface TaxLineItem {
  amount: number;       // in cents
  productTaxCode?: string;
  name: string;
}

export interface TaxCalculationResult {
  taxAmount: number;    // in cents
  taxRate: number;      // effective rate as decimal (e.g. 0.08)
  breakdown: Array<{
    jurisdiction: string;
    rate: number;
    amount: number;
  }>;
  provider: 'stripe' | 'manual' | 'none';
  stripeCalculationId?: string; // for transaction recording
}

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
      this.logger.log('Stripe Tax client initialized');
    }
  }

  /**
   * Calculate tax for a checkout.
   * Tries Stripe Tax first (if configured), then falls back to manual rates.
   */
  async calculateTax(
    lineItems: TaxLineItem[],
    shippingAddress: Address | null,
    shippingCost: number,
    taxSettings: TaxSettings,
  ): Promise<TaxCalculationResult> {
    if (!taxSettings.enabled || !shippingAddress) {
      return { taxAmount: 0, taxRate: 0, breakdown: [], provider: 'none' };
    }

    // Try Stripe Tax
    if (taxSettings.calculationMethod === 'stripe') {
      try {
        return await this.calculateWithStripe(
          lineItems,
          shippingAddress,
          shippingCost,
          taxSettings,
        );
      } catch (err) {
        this.logger.warn(
          `Stripe Tax calculation failed, falling back to manual rates: ${(err as Error).message}`,
        );
        // Fall through to manual calculation
      }
    }

    // Manual rate calculation
    return this.calculateManual(lineItems, shippingAddress, shippingCost, taxSettings);
  }

  // ─── Stripe Tax ───────────────────────────────────────────

  private async calculateWithStripe(
    lineItems: TaxLineItem[],
    shippingAddress: Address,
    shippingCost: number,
    taxSettings: TaxSettings,
  ): Promise<TaxCalculationResult> {
    if (!this.stripe) {
      throw new Error('Stripe client not initialized — set STRIPE_SECRET_KEY');
    }

    const defaultTaxCode = taxSettings.stripeProductTaxCode || 'txcd_99999999';

    const stripeLineItems: Stripe.Tax.CalculationCreateParams.LineItem[] =
      lineItems.map((item) => ({
        amount: item.amount,
        reference: item.name,
        tax_code: item.productTaxCode || defaultTaxCode,
      }));

    const params: Stripe.Tax.CalculationCreateParams = {
      currency: 'usd',
      line_items: stripeLineItems,
      customer_details: {
        address: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        address_source: 'shipping',
      },
    };

    // Include shipping cost if taxable
    if (shippingCost > 0 && taxSettings.taxShipping) {
      params.shipping_cost = { amount: shippingCost };
    }

    this.logger.debug(
      `Calling Stripe Tax for ${stripeLineItems.length} items to ${shippingAddress.state}, ${shippingAddress.country}`,
    );

    const calculation = await this.stripe.tax.calculations.create(params);

    // Build breakdown from Stripe's response
    const breakdown: TaxCalculationResult['breakdown'] = [];
    if (calculation.tax_breakdown) {
      for (const entry of calculation.tax_breakdown) {
        breakdown.push({
          jurisdiction: (entry as any).jurisdiction?.display_name || 'Tax',
          rate: entry.tax_rate_details?.percentage_decimal
            ? parseFloat(entry.tax_rate_details.percentage_decimal) / 100
            : 0,
          amount: entry.amount,
        });
      }
    }

    const taxableTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const effectiveRate = taxableTotal > 0 ? calculation.tax_amount_exclusive / taxableTotal : 0;

    this.logger.log(
      `Stripe Tax calculated: $${(calculation.tax_amount_exclusive / 100).toFixed(2)} tax (${(effectiveRate * 100).toFixed(2)}%)`,
    );

    return {
      taxAmount: calculation.tax_amount_exclusive,
      taxRate: effectiveRate,
      breakdown,
      provider: 'stripe',
      stripeCalculationId: calculation.id ?? undefined,
    };
  }

  // ─── Manual Rate Calculation ──────────────────────────────

  private calculateManual(
    lineItems: TaxLineItem[],
    shippingAddress: Address,
    shippingCost: number,
    taxSettings: TaxSettings,
  ): TaxCalculationResult {
    const taxableAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

    // Find the most specific matching rate
    const matchingRate = this.findMatchingRate(taxSettings, shippingAddress);
    const ratePercent = matchingRate
      ? parseFloat(matchingRate.rate)
      : parseFloat(taxSettings.defaultRate || '0');

    const rate = ratePercent / 100;
    let taxAmount = Math.round(taxableAmount * rate);

    // Add shipping tax if applicable
    if (shippingCost > 0 && (matchingRate?.shipping ?? taxSettings.taxShipping)) {
      taxAmount += Math.round(shippingCost * rate);
    }

    const jurisdiction = matchingRate
      ? `${matchingRate.state || matchingRate.country}`
      : 'Default';

    return {
      taxAmount,
      taxRate: rate,
      breakdown: taxAmount > 0
        ? [{ jurisdiction, rate, amount: taxAmount }]
        : [],
      provider: 'manual',
    };
  }

  private findMatchingRate(
    settings: TaxSettings,
    address: Address,
  ): TaxSettings['rates'][0] | null {
    if (!settings.rates || settings.rates.length === 0) return null;

    // Score each rate by specificity: country match + state match + postal code match
    let bestRate: TaxSettings['rates'][0] | null = null;
    let bestScore = -1;

    for (const rate of settings.rates) {
      let score = 0;

      // Country must match
      if (rate.country && rate.country !== address.country) continue;
      score += 1;

      // State match (if specified)
      if (rate.state) {
        if (rate.state !== address.state) continue;
        score += 10;
      }

      // Postal code match (if specified)
      if (rate.postalCodes) {
        const codes = rate.postalCodes.split(',').map((c) => c.trim());
        if (!codes.includes(address.postalCode)) continue;
        score += 100;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRate = rate;
      }
    }

    return bestRate;
  }

  /**
   * Load tax settings from the settings store.
   * The checkout service should call this and pass the result to calculateTax().
   */
  getDefaultSettings(): TaxSettings {
    return {
      enabled: true,
      calculationMethod: 'manual',
      defaultRate: '0',
      taxShipping: false,
      rates: [],
    };
  }
}
