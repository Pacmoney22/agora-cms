import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Mail, Check } from 'lucide-react';

export interface NewsletterSignupProps {
  heading?: string;
  description?: string | null;
  placeholder?: string;
  submitLabel?: string;
  layout?: 'inline' | 'stacked' | 'card';
  showNameField?: boolean;
  doubleOptIn?: boolean;
  className?: string;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  heading = 'Stay up to date',
  description = 'Get the latest news and updates delivered to your inbox.',
  placeholder = 'Enter your email',
  submitLabel = 'Subscribe',
  layout = 'inline',
  showNameField = false,
  doubleOptIn = false,
  className,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    if (showNameField && !name.trim()) {
      setError('Name is required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const successContent = (
    <div className="flex items-center gap-2 text-green-700">
      <Check size={20} className="shrink-0" />
      <p className="text-sm font-medium">
        {doubleOptIn
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
        submitLabel
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
              {showNameField && (
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
                  placeholder={placeholder}
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
              {showNameField && (
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
                  placeholder={placeholder}
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
      {heading && (
        <h3 className={clsx(
          'font-semibold text-gray-900',
          layout === 'card' ? 'mb-1 text-lg' : 'mb-2 text-xl',
        )}>
          {heading}
        </h3>
      )}
      {description && (
        <p className={clsx(
          'text-sm text-gray-600',
          layout === 'card' ? 'mb-4' : 'mb-4',
        )}>
          {description}
        </p>
      )}
      {formContent}
    </div>
  );
};
