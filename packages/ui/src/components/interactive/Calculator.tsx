import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Calculator as CalcIcon, ArrowRight } from 'lucide-react';

export interface CalculatorInput {
  label: string;
  type: 'slider' | 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default: number;
  unit?: string;
  key: string;
  options?: string[];
}

export interface CalculatorOutput {
  label: string;
  key: string;
  format: 'currency' | 'number' | 'percent';
  prefix?: string;
  suffix?: string;
}

export interface CalculatorProps {
  title?: string;
  inputs?: CalculatorInput[];
  formula?: string;
  outputs?: CalculatorOutput[];
  showChart?: boolean;
  chartType?: 'bar' | 'line' | 'pie';
  ctaButton?: { label: string; url: string } | null;
  disclaimer?: string | null;
  className?: string;
}

function formatOutput(value: number, format: string, prefix?: string, suffix?: string): string {
  let formatted: string;
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
      break;
    case 'percent':
      formatted = `${value.toFixed(1)}%`;
      break;
    default:
      formatted = new Intl.NumberFormat('en-US').format(value);
  }
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

function safeEvaluate(formula: string, values: Record<string, number>): Record<string, number> {
  try {
    const keys = Object.keys(values);
    const vals = Object.values(values);
    const fn = new Function(...keys, `return (${formula})`);
    const result = fn(...vals);

    if (typeof result === 'number') {
      return { result };
    }
    if (typeof result === 'object' && result !== null) {
      return result;
    }
    return { result: 0 };
  } catch {
    return { result: 0 };
  }
}

export const Calculator: React.FC<CalculatorProps> = ({
  title = 'Calculator',
  inputs = [],
  formula = '0',
  outputs = [],
  showChart = false,
  chartType = 'bar',
  ctaButton = null,
  disclaimer = null,
  className,
}) => {
  const defaultValues: Record<string, number> = {};
  inputs.forEach((input) => {
    defaultValues[input.key] = input.default;
  });

  const [values, setValues] = useState<Record<string, number>>(defaultValues);

  const results = useMemo(() => safeEvaluate(formula, values), [formula, values]);

  const handleChange = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <CalcIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </div>

      <div className="p-6">
        {/* Inputs */}
        <div className="space-y-5">
          {inputs.map((input) => (
            <div key={input.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <label
                  htmlFor={`calc-${input.key}`}
                  className="text-sm font-medium text-gray-700"
                >
                  {input.label}
                </label>
                <span className="text-sm font-semibold text-blue-600">
                  {values[input.key]?.toLocaleString()}
                  {input.unit && ` ${input.unit}`}
                </span>
              </div>

              {input.type === 'slider' && (
                <input
                  id={`calc-${input.key}`}
                  type="range"
                  min={input.min || 0}
                  max={input.max || 100}
                  step={input.step || 1}
                  value={values[input.key] || 0}
                  onChange={(e) => handleChange(input.key, Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              )}

              {input.type === 'number' && (
                <input
                  id={`calc-${input.key}`}
                  type="number"
                  min={input.min}
                  max={input.max}
                  step={input.step || 1}
                  value={values[input.key] || 0}
                  onChange={(e) => handleChange(input.key, Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              {input.type === 'select' && input.options && (
                <select
                  id={`calc-${input.key}`}
                  value={values[input.key] || 0}
                  onChange={(e) => handleChange(input.key, Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {input.options.map((opt, i) => (
                    <option key={i} value={i}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {input.type === 'slider' && (
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>
                    {input.min?.toLocaleString()}
                    {input.unit && ` ${input.unit}`}
                  </span>
                  <span>
                    {input.max?.toLocaleString()}
                    {input.unit && ` ${input.unit}`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        {outputs.length > 0 && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <div className={clsx('grid gap-4', outputs.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {outputs.map((output) => {
                const value = results[output.key] ?? results.result ?? 0;
                return (
                  <div key={output.key} className="text-center">
                    <p className="text-sm text-gray-500">{output.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatOutput(value, output.format, output.prefix, output.suffix)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Simple Bar Chart */}
        {showChart && chartType === 'bar' && outputs.length > 0 && (
          <div className="mt-4 flex items-end justify-center gap-3" style={{ height: 120 }}>
            {outputs.map((output) => {
              const value = results[output.key] ?? results.result ?? 0;
              const maxVal = Math.max(
                ...outputs.map((o) => results[o.key] ?? results.result ?? 0),
                1,
              );
              const heightPct = (Math.abs(value) / maxVal) * 100;
              return (
                <div key={output.key} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 rounded-t bg-blue-500 transition-all duration-500"
                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                  />
                  <span className="text-xs text-gray-500">{output.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {ctaButton && (
          <div className="mt-6">
            <a
              href={ctaButton.url}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {ctaButton.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p className="mt-4 text-xs text-gray-400">{disclaimer}</p>
        )}
      </div>
    </div>
  );
};
