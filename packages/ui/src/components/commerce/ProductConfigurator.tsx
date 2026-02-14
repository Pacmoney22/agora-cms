import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ConfigOption {
  name: string;
  priceModifier: number;
  image?: string;
}

export interface ConfigStep {
  title: string;
  options: ConfigOption[];
}

export interface ConfiguratorProduct {
  name: string;
  basePrice: number;
  steps: ConfigStep[];
}

export interface ProductConfiguratorProps {
  productId?: string;
  product?: ConfiguratorProduct | null;
  layout?: 'side-by-side' | 'stepper' | 'single-page';
  showPriceBreakdown?: boolean;
  showRunningTotal?: boolean;
  showPreviewImage?: boolean;
  showSkuDisplay?: boolean;
  addToCartPosition?: 'bottom' | 'sticky' | 'inline';
  onAddToCart?: (selections: Record<string, ConfigOption>, totalPrice: number) => void;
  className?: string;
}

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
  productId,
  product = null,
  layout = 'stepper',
  showPriceBreakdown = true,
  showRunningTotal = true,
  showPreviewImage = true,
  showSkuDisplay = false,
  addToCartPosition = 'bottom',
  onAddToCart,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, ConfigOption>>({});

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const formatModifier = (modifier: number) => {
    if (modifier === 0) return 'Included';
    const sign = modifier > 0 ? '+' : '';
    return `${sign}${formatPrice(modifier)}`;
  };

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    const base = product.basePrice;
    const modifiers = Object.values(selections).reduce((sum, opt) => sum + opt.priceModifier, 0);
    return base + modifiers;
  }, [product, selections]);

  const generatedSku = useMemo(() => {
    if (!product || !showSkuDisplay) return '';
    const parts = product.steps.map((step) => {
      const sel = selections[step.title];
      return sel ? sel.name.substring(0, 3).toUpperCase() : '---';
    });
    return parts.join('-');
  }, [product, selections, showSkuDisplay]);

  // Find the latest selected option with an image for preview
  const previewImage = useMemo(() => {
    if (!product) return null;
    const allSelections = Object.values(selections);
    for (let i = allSelections.length - 1; i >= 0; i--) {
      if (allSelections[i]?.image) return allSelections[i]!.image;
    }
    return null;
  }, [product, selections]);

  const allStepsComplete = product
    ? product.steps.every((step) => selections[step.title])
    : false;

  if (!product) {
    return (
      <div className={clsx('animate-pulse rounded-lg border border-gray-200 p-8', className)}>
        <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
        <div className="mb-2 h-4 w-full rounded bg-gray-200" />
        <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-40 w-full rounded bg-gray-200" />
      </div>
    );
  }

  const selectOption = (stepTitle: string, option: ConfigOption) => {
    setSelections((prev) => ({ ...prev, [stepTitle]: option }));
  };

  const renderStepOptions = (step: ConfigStep) => {
    const selected = selections[step.title];

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {step.options.map((option, i) => {
          const isSelected = selected?.name === option.name;

          return (
            <button
              key={i}
              onClick={() => selectOption(step.title, option)}
              className={clsx(
                'flex flex-col items-center rounded-lg border-2 p-4 text-center transition-all',
                isSelected
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
              )}
            >
              {option.image && (
                <img
                  src={option.image}
                  alt={option.name}
                  className="mb-3 h-20 w-20 rounded-md object-cover"
                />
              )}
              <span
                className={clsx(
                  'text-sm font-medium',
                  isSelected ? 'text-blue-700' : 'text-gray-900',
                )}
              >
                {option.name}
              </span>
              <span
                className={clsx(
                  'mt-1 text-xs',
                  isSelected ? 'text-blue-600' : 'text-gray-500',
                )}
              >
                {formatModifier(option.priceModifier)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPriceBreakdown = () => {
    if (!showPriceBreakdown) return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Price Breakdown</h4>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base price</span>
            <span className="text-gray-900">{formatPrice(product.basePrice)}</span>
          </div>
          {product.steps.map((step) => {
            const sel = selections[step.title];
            if (!sel || sel.priceModifier === 0) return null;
            return (
              <div key={step.title} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {step.title}: {sel.name}
                </span>
                <span className={clsx(sel.priceModifier > 0 ? 'text-gray-900' : 'text-green-600')}>
                  {formatModifier(sel.priceModifier)}
                </span>
              </div>
            );
          })}
          <div className="mt-2 border-t border-gray-300 pt-2">
            <div className="flex justify-between font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRunningTotal = () => {
    if (!showRunningTotal) return null;

    return (
      <div className="flex items-center justify-between rounded-md bg-gray-900 px-4 py-3">
        <span className="text-sm text-white/70">Running Total</span>
        <span className="text-lg font-bold text-white">{formatPrice(totalPrice)}</span>
      </div>
    );
  };

  const renderAddToCart = () => (
    <button
      onClick={() => onAddToCart?.(selections, totalPrice)}
      disabled={!allStepsComplete}
      className={clsx(
        'flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors',
        allStepsComplete
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'cursor-not-allowed bg-gray-300 text-gray-500',
      )}
    >
      <ShoppingCart className="h-4 w-4" />
      Add to Cart {allStepsComplete && `- ${formatPrice(totalPrice)}`}
    </button>
  );

  const renderPreviewImage = () => {
    if (!showPreviewImage) return null;

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        {previewImage ? (
          <img
            src={previewImage}
            alt={`${product.name} configuration preview`}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-gray-400">
            <span className="text-sm">Select options to preview</span>
          </div>
        )}
      </div>
    );
  };

  // Stepper layout
  if (layout === 'stepper') {
    const step = product.steps[currentStep]!;
    const isFirst = currentStep === 0;
    const isLast = currentStep === product.steps.length - 1;

    return (
      <div className={clsx('w-full', className)}>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{product.name}</h2>

        {/* Step indicators */}
        <div className="mb-6 flex items-center gap-2">
          {product.steps.map((s, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => setCurrentStep(i)}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  i === currentStep
                    ? 'bg-blue-600 text-white'
                    : selections[s.title]
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-500',
                )}
              >
                {i + 1}
              </button>
              {i < product.steps.length - 1 && (
                <div
                  className={clsx(
                    'h-0.5 flex-1',
                    selections[s.title] ? 'bg-blue-300' : 'bg-gray-200',
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex gap-8">
          <div className="flex-1">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Step {currentStep + 1}: {step.title}
            </h3>
            {renderStepOptions(step)}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep((p) => p - 1)}
                disabled={isFirst}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  isFirst
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {isLast ? (
                renderAddToCart()
              ) : (
                <button
                  onClick={() => setCurrentStep((p) => p + 1)}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden w-72 flex-shrink-0 space-y-4 lg:block">
            {renderPreviewImage()}
            {renderRunningTotal()}
            {renderPriceBreakdown()}
            {showSkuDisplay && generatedSku && (
              <p className="text-xs text-gray-500">
                SKU: <span className="font-mono">{generatedSku}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Side-by-side layout
  if (layout === 'side-by-side') {
    return (
      <div className={clsx('flex w-full gap-8', className)}>
        {/* Left: preview */}
        <div className="hidden w-1/2 flex-shrink-0 space-y-4 lg:block">
          {renderPreviewImage()}
          {showSkuDisplay && generatedSku && (
            <p className="text-xs text-gray-500">
              SKU: <span className="font-mono">{generatedSku}</span>
            </p>
          )}
        </div>

        {/* Right: configuration */}
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>

          {product.steps.map((step, i) => (
            <div key={i}>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">{step.title}</h3>
              {renderStepOptions(step)}
            </div>
          ))}

          {renderRunningTotal()}
          {renderPriceBreakdown()}

          <div className={clsx(addToCartPosition === 'sticky' && 'sticky bottom-4')}>
            {renderAddToCart()}
          </div>
        </div>
      </div>
    );
  }

  // Single-page layout
  return (
    <div className={clsx('w-full', className)}>
      <h2 className="mb-2 text-2xl font-bold text-gray-900">{product.name}</h2>
      {showRunningTotal && <div className="mb-6">{renderRunningTotal()}</div>}

      <div className="space-y-8">
        {product.steps.map((step, i) => (
          <div key={i}>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">{step.title}</h3>
            {renderStepOptions(step)}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>{renderPriceBreakdown()}</div>
        <div className="space-y-4">
          {renderPreviewImage()}
          {showSkuDisplay && generatedSku && (
            <p className="text-xs text-gray-500">
              SKU: <span className="font-mono">{generatedSku}</span>
            </p>
          )}
        </div>
      </div>

      <div className={clsx('mt-6', addToCartPosition === 'sticky' && 'sticky bottom-4')}>
        {renderAddToCart()}
      </div>
    </div>
  );
};
