import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

export interface FormWizardField {
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date' | 'number' | 'url' | 'hidden';
  label: string;
  placeholder?: string;
  required: boolean;
  width: 'full' | 'half';
  options?: string[];
}

export interface FormWizardStep {
  title: string;
  description?: string;
  fields: FormWizardField[];
}

export interface FormWizardProps {
  steps?: FormWizardStep[];
  progressStyle?: 'bar' | 'steps' | 'dots' | 'numbered';
  showStepLabels?: boolean;
  allowBackNavigation?: boolean;
  validatePerStep?: boolean;
  submitLabel?: string;
  successAction?: 'show-message' | 'redirect';
  successMessage?: string;
  submitEndpoint?: string | null;
  saveDraft?: boolean;
  className?: string;
}

const defaultSteps: FormWizardStep[] = [
  {
    title: 'Personal Info',
    description: 'Tell us about yourself',
    fields: [
      { type: 'text', label: 'First Name', placeholder: 'John', required: true, width: 'half' },
      { type: 'text', label: 'Last Name', placeholder: 'Doe', required: true, width: 'half' },
      { type: 'email', label: 'Email', placeholder: 'john@example.com', required: true, width: 'full' },
    ],
  },
  {
    title: 'Details',
    description: 'A few more details',
    fields: [
      { type: 'phone', label: 'Phone', placeholder: '(555) 123-4567', required: false, width: 'half' },
      { type: 'text', label: 'Company', placeholder: 'Acme Corp', required: false, width: 'half' },
      { type: 'select', label: 'Role', required: true, width: 'full', options: ['Developer', 'Designer', 'Manager', 'Other'] },
    ],
  },
  {
    title: 'Review',
    description: 'Review and submit',
    fields: [
      { type: 'textarea', label: 'Additional Notes', placeholder: 'Anything else you want us to know?', required: false, width: 'full' },
    ],
  },
];

export const FormWizard: React.FC<FormWizardProps> = ({
  steps = defaultSteps,
  progressStyle = 'steps',
  showStepLabels = true,
  allowBackNavigation = true,
  validatePerStep = true,
  submitLabel = 'Submit',
  successAction = 'show-message',
  successMessage = 'Your submission has been received. Thank you!',
  submitEndpoint = null,
  saveDraft = false,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const step = steps[currentStep];

  const fieldId = (label: string) => `wizard-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const stepFields = steps[stepIndex]!.fields;

    stepFields.forEach((field) => {
      if (field.type === 'hidden') return;
      const key = fieldId(field.label);
      const val = values[key];

      if (field.required && (!val || val.trim() === '')) {
        newErrors[key] = `${field.label} is required`;
      }

      if (field.type === 'email' && val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          newErrors[key] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'url' && val) {
        try {
          new URL(val);
        } catch {
          newErrors[key] = 'Please enter a valid URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleNext = () => {
    if (validatePerStep && !validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    if (!allowBackNavigation) return;
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validatePerStep && !validateStep(currentStep)) return;

    setSubmitting(true);

    try {
      if (submitEndpoint) {
        // Build payload from all steps
        const payload: Record<string, string> = {};
        steps.forEach((s) => {
          s.fields.forEach((field) => {
            const key = fieldId(field.label);
            payload[field.label] = values[key] ?? '';
          });
        });

        const res = await fetch(submitEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`Submission failed (${res.status})`);
        }
      }

      setSubmitted(true);
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    // Presentational only - in a real app, this would persist the data
  };

  // Progress indicators
  const renderProgress = () => {
    const progressPercent = ((currentStep + 1) / totalSteps) * 100;

    if (progressStyle === 'bar') {
      return (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      );
    }

    if (progressStyle === 'dots') {
      return (
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'h-2.5 w-2.5 rounded-full transition-colors',
                i === currentStep ? 'bg-blue-600' : i < currentStep ? 'bg-blue-400' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
      );
    }

    if (progressStyle === 'numbered') {
      return (
        <div className="mb-6 flex items-center justify-center gap-1">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    i === currentStep
                      ? 'bg-blue-600 text-white'
                      : i < currentStep
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-200 text-gray-500',
                  )}
                >
                  {i < currentStep ? <Check size={14} /> : i + 1}
                </div>
                {showStepLabels && (
                  <span className={clsx(
                    'mt-1 text-xs',
                    i === currentStep ? 'font-medium text-blue-600' : 'text-gray-500',
                  )}>
                    {s.title}
                  </span>
                )}
              </div>
              {i < totalSteps - 1 && (
                <div className={clsx(
                  'mx-1 h-px w-8 sm:w-12',
                  i < currentStep ? 'bg-blue-400' : 'bg-gray-300',
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Default: steps style
    return (
      <div className="mb-6 flex items-center justify-center">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  i === currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : i < currentStep
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-500',
                )}
              >
                {i < currentStep ? <Check size={16} /> : i + 1}
              </div>
              {showStepLabels && (
                <span className={clsx(
                  'mt-1.5 max-w-[80px] text-center text-xs leading-tight',
                  i === currentStep ? 'font-medium text-blue-600' : 'text-gray-500',
                )}>
                  {s.title}
                </span>
              )}
            </div>
            {i < totalSteps - 1 && (
              <div className={clsx(
                'mx-2 h-0.5 w-10 sm:w-16',
                i < currentStep ? 'bg-blue-600' : 'bg-gray-300',
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderField = (field: FormWizardField, index: number) => {
    const key = fieldId(field.label);
    const error = errors[key];
    const value = values[key] ?? '';

    if (field.type === 'hidden') {
      return <input key={index} type="hidden" name={field.label} value={value} />;
    }

    const labelEl = (
      <label htmlFor={key} className="mb-1 block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
    );

    const inputClasses = clsx(
      'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
      error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400',
    );

    let input: React.ReactNode;

    switch (field.type) {
      case 'textarea':
        input = (
          <textarea
            id={key}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            required={field.required}
            rows={4}
            className={inputClasses}
          />
        );
        break;

      case 'select':
        input = (
          <select
            id={key}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            required={field.required}
            className={inputClasses}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
        break;

      case 'radio':
        input = (
          <div className="flex flex-wrap gap-4 pt-1">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name={key}
                  value={opt}
                  checked={value === opt}
                  onChange={() => handleChange(key, opt)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {opt}
              </label>
            ))}
          </div>
        );
        break;

      case 'checkbox':
        input = (
          <div className="flex flex-wrap gap-4 pt-1">
            {field.options?.map((opt) => {
              const checked = value.split(',').filter(Boolean).includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = value.split(',').filter(Boolean);
                      const next = checked ? current.filter((v) => v !== opt) : [...current, opt];
                      handleChange(key, next.join(','));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
        break;

      case 'file':
        input = (
          <input
            id={key}
            type="file"
            onChange={(e) => handleChange(key, e.target.files?.[0]?.name ?? '')}
            required={field.required}
            className="w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100"
          />
        );
        break;

      default:
        input = (
          <input
            id={key}
            type={field.type === 'phone' ? 'tel' : field.type}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            required={field.required}
            className={inputClasses}
          />
        );
    }

    return (
      <div
        key={index}
        className={clsx(field.width === 'half' ? 'w-full sm:w-[calc(50%-0.5rem)]' : 'w-full')}
      >
        {labelEl}
        {input}
        {error && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <X size={12} />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (submitted) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center rounded-lg border border-green-200 bg-green-50 p-8 text-center',
          className,
        )}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check size={24} className="text-green-600" />
        </span>
        <p className="text-lg font-medium text-green-800">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className={clsx('w-full', className)}>
      {renderProgress()}

      <form onSubmit={handleSubmit} noValidate>
        {steps.map((s, stepIndex) => (
          <fieldset
            key={stepIndex}
            className={clsx(stepIndex === currentStep ? 'block' : 'hidden')}
            disabled={stepIndex !== currentStep}
          >
            {(s.title || s.description) && (
              <div className="mb-5">
                {s.title && <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>}
                {s.description && <p className="mt-0.5 text-sm text-gray-600">{s.description}</p>}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {s.fields.map((field, i) => renderField(field, i))}
            </div>
          </fieldset>
        ))}

        {errors['_form'] && (
          <p className="mt-4 flex items-center gap-1 text-sm text-red-600">
            <X size={14} />
            {errors['_form']}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 0 && allowBackNavigation && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
            )}
            {saveDraft && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
              >
                Save Draft
              </button>
            )}
          </div>

          <div>
            {isLastStep ? (
              <button
                type="submit"
                disabled={submitting}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-md px-5 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  submitting ? 'cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700',
                )}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <Check size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
