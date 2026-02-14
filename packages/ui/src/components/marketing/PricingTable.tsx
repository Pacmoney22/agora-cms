import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Check, X, Info } from 'lucide-react';

export interface PlanFeature {
  text: string;
  included: boolean;
  tooltip?: string;
}

export interface Plan {
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice?: number;
  features: PlanFeature[];
  ctaLabel: string;
  ctaUrl: string;
  highlighted: boolean;
  badge?: string;
}

export interface PricingTableProps {
  plans?: Plan[];
  billingToggle?: boolean;
  currency?: string;
  comparisonMode?: 'cards' | 'table';
  highlightLabel?: string;
  className?: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function FeatureTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label={text}
      >
        <Info size={14} />
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

function PricingCards({
  plans,
  isAnnual,
  currency,
}: {
  plans: Plan[];
  isAnnual: boolean;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {plans.map((plan, index) => {
        const price = isAnnual && plan.annualPrice != null ? plan.annualPrice : plan.monthlyPrice;
        const period = isAnnual ? '/yr' : '/mo';

        return (
          <div
            key={index}
            className={clsx(
              'relative flex flex-col rounded-xl border p-6',
              plan.highlighted
                ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                : 'border-gray-200 shadow-sm',
            )}
          >
            {plan.badge && plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-medium text-white">
                {plan.badge}
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              )}
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(price, currency)}
              </span>
              <span className="text-gray-500">{period}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature, fIndex) => (
                <li key={fIndex} className="flex items-start gap-2 text-sm">
                  {feature.included ? (
                    <Check size={16} className="mt-0.5 shrink-0 text-green-500" />
                  ) : (
                    <X size={16} className="mt-0.5 shrink-0 text-gray-300" />
                  )}
                  <span className={clsx(feature.included ? 'text-gray-700' : 'text-gray-400')}>
                    {feature.text}
                    {feature.tooltip && <FeatureTooltip text={feature.tooltip} />}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={plan.ctaUrl}
              className={clsx(
                'block w-full rounded-lg py-2.5 text-center font-medium transition-colors',
                plan.highlighted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {plan.ctaLabel}
            </a>
          </div>
        );
      })}
    </div>
  );
}

function PricingComparisonTable({
  plans,
  isAnnual,
  currency,
}: {
  plans: Plan[];
  isAnnual: boolean;
  currency: string;
}) {
  const allFeatureTexts = Array.from(
    new Set(plans.flatMap((plan) => plan.features.map((f) => f.text))),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-gray-200 p-4 text-left font-medium text-gray-500">
              Features
            </th>
            {plans.map((plan, index) => {
              const price = isAnnual && plan.annualPrice != null ? plan.annualPrice : plan.monthlyPrice;
              const period = isAnnual ? '/yr' : '/mo';

              return (
                <th
                  key={index}
                  className={clsx(
                    'border-b p-4 text-center',
                    plan.highlighted ? 'border-blue-500 bg-blue-50' : 'border-gray-200',
                  )}
                >
                  <div className="font-semibold text-gray-900">{plan.name}</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">
                    {formatPrice(price, currency)}
                    <span className="text-sm font-normal text-gray-500">{period}</span>
                  </div>
                  {plan.badge && plan.highlighted && (
                    <span className="mt-2 inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                      {plan.badge}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {allFeatureTexts.map((featureText, fIndex) => (
            <tr key={fIndex} className="border-b border-gray-100">
              <td className="p-4 text-gray-700">{featureText}</td>
              {plans.map((plan, pIndex) => {
                const feature = plan.features.find((f) => f.text === featureText);
                return (
                  <td
                    key={pIndex}
                    className={clsx(
                      'p-4 text-center',
                      plan.highlighted && 'bg-blue-50/50',
                    )}
                  >
                    {feature?.included ? (
                      <Check size={18} className="mx-auto text-green-500" />
                    ) : (
                      <X size={18} className="mx-auto text-gray-300" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="p-4" />
            {plans.map((plan, index) => (
              <td key={index} className={clsx('p-4 text-center', plan.highlighted && 'bg-blue-50/50')}>
                <a
                  href={plan.ctaUrl}
                  className={clsx(
                    'inline-block rounded-lg px-6 py-2.5 font-medium transition-colors',
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {plan.ctaLabel}
                </a>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const PricingTable: React.FC<PricingTableProps> = ({
  plans = [],
  billingToggle = true,
  currency = 'USD',
  comparisonMode = 'cards',
  highlightLabel = 'Most Popular',
  className,
}) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const hasAnnualPricing = plans.some((plan) => plan.annualPrice != null);

  return (
    <div className={clsx('w-full', className)}>
      {billingToggle && hasAnnualPricing && (
        <div className="mb-8 flex items-center justify-center gap-3">
          <span
            className={clsx(
              'text-sm font-medium',
              !isAnnual ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual((prev) => !prev)}
            className={clsx(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              isAnnual ? 'bg-blue-600' : 'bg-gray-200',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                isAnnual ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
          <span
            className={clsx(
              'text-sm font-medium',
              isAnnual ? 'text-gray-900' : 'text-gray-500',
            )}
          >
            Annual
          </span>
        </div>
      )}

      {comparisonMode === 'cards' ? (
        <PricingCards plans={plans} isAnnual={isAnnual} currency={currency} />
      ) : (
        <PricingComparisonTable plans={plans} isAnnual={isAnnual} currency={currency} />
      )}
    </div>
  );
};
