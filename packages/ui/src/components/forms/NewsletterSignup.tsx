import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Mail, Check } from 'lucide-react';

export interface NewsletterSignupProps {
  /** ID of admin-built form to load (preferred). */
  formId?: string;
  heading?: string;
  description?: string | null;
  placeholder?: string;
  submitLabel?: string;
  layout?: 'inline' | 'stacked' | 'card';
  showNameField?: boolean;
  doubleOptIn?: boolean;
  submitEndpoint?: string | null;
  /** Base URL for the content API (used to fetch form definitions). */
  contentApiUrl?: string;
  className?: string;
}

interface LoadedFormMeta {
  name?: string;
  heading?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  submitEndpoint?: string;
  showNameField?: boolean;
  doubleOptIn?: boolean;
  fields?: Array<{ type: string; label: string; placeholder?: string; required?: boolean }>;
}

const DEFAULT_CONTENT_API = 'http://localhost:3001';

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  formId,
  heading = 'Stay up to date',
  description = 'Get the latest news and updates delivered to your inbox.',
  placeholder = 'Enter your email',
  submitLabel = 'Subscribe',
  layout = 'inline',
  showNameField = false,
  doubleOptIn = false,
  submitEndpoint = null,
  contentApiUrl = DEFAULT_CONTENT_API,
  className,
}) => {
  const [formMeta, setFormMeta] = useState<LoadedFormMeta | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!formId) return;
    fetch(`${contentApiUrl}/api/v1/settings/forms/${formId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setFormMeta(data);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true));
  }, [formId, contentApiUrl]);

  // Resolve props — loaded form meta overrides inline props
  const resolvedHeading = formMeta?.heading || heading;
  const resolvedDescription = formMeta?.description ?? description;
  const resolvedPlaceholder = formMeta?.placeholder || placeholder;
  const resolvedSubmitLabel = formMeta?.submitLabel || submitLabel;
  const resolvedShowName = formMeta?.showNameField ?? showNameField;
  const resolvedDoubleOptIn = formMeta?.doubleOptIn ?? doubleOptIn;
  const resolvedEndpoint = formMeta?.submitEndpoint || submitEndpoint;

  // Loading state
  if (formId && !formMeta && !loadError) {
    return (
      <div className={clsx('animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-6', className)}>
        <div className="h-5 w-40 rounded bg-gray-200 mb-2" />
        <div className="h-3 w-64 rounded bg-gray-200 mb-4" />
        <div className="h-10 rounded bg-gray-200" />
      </div>
    );
  }

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (resolvedShowName && !name.trim()) {
      setError('Name is required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (resolvedEndpoint) {
        const payload: Record<string, string> = { email };
        if (resolvedShowName) payload.name = name;
        if (formId) payload.formId = formId;

        const res = await fetch(resolvedEndpoint, {
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
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const successContent = (
    <div className="flex items-center gap-2 text-green-700">
      <Check size={20} className="shrink-0" />
      <p className="text-sm font-medium">
        {resolvedDoubleOptIn
          ? 'Please check your email to confirm your subscription.'
          : 'You\'re subscribed! Thank you for signing up.'}
      </p>
    </div>
  );

  const inputClasses = clsx(
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
    error && 'border-red-400 bg-red-50',
  );

  const buttonEl = (
    <button
      type="submit"
      disabled={submitting}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        submitting
          ? 'cursor-not-allowed bg-blue-400'
          : 'bg-blue-600 hover:bg-blue-700',
      )}
    >
      {submitting ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        resolvedSubmitLabel
      )}
    </button>
  );

  const formContent = (
    <>
      {submitted ? (
        successContent
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {layout === 'inline' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {resolvedShowName && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClasses}
                  aria-label="Name"
                />
              )}
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder={resolvedPlaceholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={clsx(inputClasses, 'pl-9')}
                  aria-label="Email address"
                />
              </div>
              {buttonEl}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {resolvedShowName && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClasses}
                  aria-label="Name"
                />
              )}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder={resolvedPlaceholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={clsx(inputClasses, 'pl-9')}
                  aria-label="Email address"
                />
              </div>
              {buttonEl}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </form>
      )}
    </>
  );

  const wrapperClasses = clsx(
    'w-full',
    layout === 'card' && 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
    className,
  );

  return (
    <div className={wrapperClasses}>
      {resolvedHeading && (
        <h3 className={clsx(
          'font-semibold text-gray-900',
          layout === 'card' ? 'mb-1 text-lg' : 'mb-2 text-xl',
        )}>
          {resolvedHeading}
        </h3>
      )}
      {resolvedDescription && (
        <p className={clsx(
          'text-sm text-gray-600',
          layout === 'card' ? 'mb-4' : 'mb-4',
        )}>
          {resolvedDescription}
        </p>
      )}
      {formContent}
    </div>
  );
};
