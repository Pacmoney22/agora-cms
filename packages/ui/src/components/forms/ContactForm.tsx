import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Check, X } from 'lucide-react';

export interface ContactFormField {
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date' | 'number' | 'url' | 'hidden';
  label: string;
  placeholder?: string;
  required: boolean;
  width: 'full' | 'half';
  options?: string[];
}

export interface ContactFormProps {
  /** ID of admin-built form to load (preferred). */
  formId?: string;
  /** Inline fields — used for backward compatibility or when formId is not set. */
  fields?: ContactFormField[];
  submitLabel?: string;
  successMessage?: string;
  successAction?: 'show-message' | 'redirect';
  redirectUrl?: string | null;
  recipientEmail?: string | null;
  submitEndpoint?: string | null;
  honeypot?: boolean;
  consentCheckbox?: { label: string; required: boolean } | null;
  buttonStyle?: 'primary' | 'secondary' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  labelPosition?: 'above' | 'inline' | 'hidden';
  /** Base URL for the content API (used to fetch form definitions). */
  contentApiUrl?: string;
  className?: string;
}

const sampleFields: ContactFormField[] = [
  { type: 'text', label: 'Name', placeholder: 'Your name', required: true, width: 'full' },
  { type: 'email', label: 'Email', placeholder: 'your@email.com', required: true, width: 'half' },
  { type: 'phone', label: 'Phone', placeholder: '(555) 123-4567', required: false, width: 'half' },
  { type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true, width: 'full' },
];

const DEFAULT_CONTENT_API = 'http://localhost:3001';

const buttonStyles = {
  primary: {
    base: 'bg-blue-600 text-white hover:bg-blue-700',
    disabled: 'bg-blue-400 text-white cursor-not-allowed',
  },
  secondary: {
    base: 'bg-gray-600 text-white hover:bg-gray-700',
    disabled: 'bg-gray-400 text-white cursor-not-allowed',
  },
  outline: {
    base: 'border-2 border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50',
    disabled: 'border-2 border-blue-300 text-blue-300 bg-transparent cursor-not-allowed',
  },
};

const inputSizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const ContactForm: React.FC<ContactFormProps> = ({
  formId,
  fields,
  submitLabel = 'Submit',
  successMessage = 'Thank you! Your submission has been received.',
  successAction = 'show-message',
  redirectUrl = null,
  recipientEmail = null,
  submitEndpoint = null,
  honeypot = true,
  consentCheckbox = null,
  buttonStyle = 'primary',
  inputSize = 'md',
  labelPosition = 'above',
  contentApiUrl = DEFAULT_CONTENT_API,
  className,
}) => {
  // All hooks must be called before any conditional returns
  const [loadedFields, setLoadedFields] = useState<ContactFormField[] | null>(null);
  const [formMeta, setFormMeta] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (!formId) return;
    fetch(`${contentApiUrl}/api/v1/settings/forms/${formId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.fields) {
          setLoadedFields(data.fields);
          setFormMeta(data);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true));
  }, [formId]);

  // Resolve active fields: formId-loaded > inline fields > sample
  const activeFields = loadedFields || fields || sampleFields;

  // Resolve settings — formMeta overrides can come from the loaded form definition
  const resolvedSubmitEndpoint = (formMeta?.submitEndpoint as string) || submitEndpoint;
  const resolvedSuccessMessage = (formMeta?.successMessage as string) || successMessage;
  const resolvedSubmitLabel = (formMeta?.submitLabel as string) || submitLabel;
  const resolvedRecipientEmail = (formMeta?.recipientEmail as string) || recipientEmail;
  const resolvedConsent = (formMeta?.consentCheckbox as { label: string; required: boolean } | undefined) || consentCheckbox;

  // If loading form by ID, show placeholder
  if (formId && !loadedFields && !loadError) {
    return (
      <div className={clsx('animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-8', className)}>
        <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
        <div className="h-10 rounded bg-gray-200 mb-3" />
        <div className="h-10 rounded bg-gray-200 mb-3" />
        <div className="h-10 w-28 rounded bg-gray-200" />
      </div>
    );
  }

  const fieldId = (label: string) => `contact-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    activeFields.forEach((field) => {
      if (field.type === 'hidden') return;
      const key = fieldId(field.label);
      const val = values[key];

      if (field.required && (!val || (typeof val === 'string' && val.trim() === ''))) {
        newErrors[key] = `${field.label} is required`;
      }

      if (field.type === 'email' && val && typeof val === 'string') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(val)) {
          newErrors[key] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'url' && val && typeof val === 'string') {
        try {
          new URL(val);
        } catch {
          newErrors[key] = 'Please enter a valid URL';
        }
      }
    });

    if (resolvedConsent?.required && !consentChecked) {
      newErrors['consent'] = 'You must agree to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Check honeypot
    if (honeypot && values['_hp']) return;

    setSubmitting(true);

    try {
      // Build form data payload
      const payload: Record<string, unknown> = {};
      activeFields.forEach((field) => {
        const key = fieldId(field.label);
        payload[field.label] = values[key] ?? '';
      });
      if (resolvedRecipientEmail) {
        payload._recipientEmail = resolvedRecipientEmail;
      }

      const endpoint = resolvedSubmitEndpoint;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`Submission failed (${res.status})`);
        }
      }

      if (successAction === 'redirect' && redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setSubmitted(true);
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
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
        <p className="text-lg font-medium text-green-800">{resolvedSuccessMessage}</p>
      </div>
    );
  }

  const sizeClass = inputSizeClasses[inputSize];
  const btnStyle = buttonStyles[buttonStyle];

  const renderField = (field: ContactFormField, index: number) => {
    const key = fieldId(field.label);
    const error = errors[key];
    const value = (values[key] as string) ?? '';

    if (field.type === 'hidden') {
      return <input key={index} type="hidden" name={field.label} value={value} />;
    }

    const labelEl = labelPosition !== 'hidden' ? (
      <label
        htmlFor={key}
        className={clsx(
          'text-sm font-medium text-gray-700',
          labelPosition === 'above' ? 'mb-1 block' : 'inline-flex items-center mr-3 min-w-[120px]',
        )}
      >
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
    ) : null;

    const inputClasses = clsx(
      'w-full rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
      sizeClass,
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
            aria-label={labelPosition === 'hidden' ? field.label : undefined}
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
            aria-label={labelPosition === 'hidden' ? field.label : undefined}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
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
            aria-label={labelPosition === 'hidden' ? field.label : undefined}
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
            aria-label={labelPosition === 'hidden' ? field.label : undefined}
          />
        );
    }

    return (
      <div
        key={index}
        className={clsx(
          field.width === 'half' ? 'w-full sm:w-[calc(50%-0.5rem)]' : 'w-full',
          labelPosition === 'inline' ? 'flex items-start' : '',
        )}
      >
        {labelEl}
        <div className={labelPosition === 'inline' ? 'flex-1' : ''}>
          {input}
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <X size={12} />
              {error}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={clsx('w-full', className)}
    >
      <div className="flex flex-wrap gap-4">
        {activeFields.map((field, i) => renderField(field, i))}
      </div>

      {/* Honeypot field for spam prevention */}
      {honeypot && (
        <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
          <label htmlFor="contact-hp">Leave this empty</label>
          <input
            id="contact-hp"
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            value={(values['_hp'] as string) ?? ''}
            onChange={(e) => handleChange('_hp', e.target.value)}
          />
        </div>
      )}

      {resolvedConsent && (
        <div className="mt-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => {
                setConsentChecked(e.target.checked);
                if (errors['consent']) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next['consent'];
                    return next;
                  });
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              {resolvedConsent.label}
              {resolvedConsent.required && <span className="ml-0.5 text-red-500">*</span>}
            </span>
          </label>
          {errors['consent'] && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <X size={12} />
              {errors['consent']}
            </p>
          )}
        </div>
      )}

      {/* Hidden recipient email for form handler */}
      {resolvedRecipientEmail && <input type="hidden" name="_to" value={resolvedRecipientEmail} />}

      {errors['_form'] && (
        <p className="mt-4 flex items-center gap-1 text-sm text-red-600">
          <X size={14} />
          {errors['_form']}
        </p>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={submitting}
          className={clsx(
            'inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            submitting ? btnStyle.disabled : btnStyle.base,
          )}
        >
          {submitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            resolvedSubmitLabel
          )}
        </button>
      </div>
    </form>
  );
};
