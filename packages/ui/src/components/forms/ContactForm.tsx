import React, { useState } from 'react';
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
  fields?: ContactFormField[];
  submitLabel?: string;
  successMessage?: string;
  successAction?: 'show-message' | 'redirect';
  redirectUrl?: string | null;
  recipientEmail?: string | null;
  honeypot?: boolean;
  consentCheckbox?: { label: string; required: boolean } | null;
  className?: string;
}

const defaultFields: ContactFormField[] = [
  { type: 'text', label: 'Name', placeholder: 'Your name', required: true, width: 'full' },
  { type: 'email', label: 'Email', placeholder: 'your@email.com', required: true, width: 'half' },
  { type: 'phone', label: 'Phone', placeholder: '(555) 123-4567', required: false, width: 'half' },
  { type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true, width: 'full' },
];

export const ContactForm: React.FC<ContactFormProps> = ({
  fields = defaultFields,
  submitLabel = 'Send Message',
  successMessage = 'Thank you! Your message has been sent successfully.',
  successAction = 'show-message',
  redirectUrl = null,
  recipientEmail = null,
  honeypot = true,
  consentCheckbox = null,
  className,
}) => {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const fieldId = (label: string) => `contact-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
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

    if (consentCheckbox?.required && !consentChecked) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    // Simulate async submission
    setTimeout(() => {
      setSubmitting(false);

      if (successAction === 'redirect' && redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setSubmitted(true);
    }, 800);
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

  const renderField = (field: ContactFormField, index: number) => {
    const key = fieldId(field.label);
    const error = errors[key];
    const value = (values[key] as string) ?? '';

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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={clsx('w-full', className)}
    >
      <div className="flex flex-wrap gap-4">
        {fields.map((field, i) => renderField(field, i))}
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

      {consentCheckbox && (
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
              {consentCheckbox.label}
              {consentCheckbox.required && <span className="ml-0.5 text-red-500">*</span>}
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
      {recipientEmail && <input type="hidden" name="_to" value={recipientEmail} />}

      <div className="mt-6">
        <button
          type="submit"
          disabled={submitting}
          className={clsx(
            'inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            submitting
              ? 'cursor-not-allowed bg-blue-400'
              : 'bg-blue-600 hover:bg-blue-700',
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
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};
