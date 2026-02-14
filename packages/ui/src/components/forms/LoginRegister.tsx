import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export interface LoginRegisterProps {
  defaultView?: 'login' | 'register';
  showToggle?: boolean;
  showSocialLogin?: boolean;
  socialProviders?: Array<'google' | 'apple' | 'facebook' | 'github'>;
  showForgotPassword?: boolean;
  registerFields?: string[];
  layout?: 'card' | 'split-image' | 'minimal';
  splitImage?: string | null;
  termsCheckbox?: { label: string; required: boolean } | null;
  className?: string;
}

const socialIcons: Record<string, React.ReactNode> = {
  google: (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  ),
  apple: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  ),
  facebook: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  github: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  ),
};

const socialLabels: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
  github: 'GitHub',
};

export const LoginRegister: React.FC<LoginRegisterProps> = ({
  defaultView = 'login',
  showToggle = true,
  showSocialLogin = false,
  socialProviders = ['google', 'apple'],
  showForgotPassword = true,
  registerFields = ['name', 'email', 'password'],
  layout = 'card',
  splitImage = null,
  termsCheckbox = null,
  className,
}) => {
  const [view, setView] = useState<'login' | 'register'>(defaultView);
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (view === 'login') {
      if (!values['email']?.trim()) newErrors['email'] = 'Email is required';
      if (!values['password']?.trim()) newErrors['password'] = 'Password is required';
    } else {
      registerFields.forEach((field) => {
        if (!values[field]?.trim()) {
          newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }
      });

      if (values['email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values['email'])) {
        newErrors['email'] = 'Please enter a valid email address';
      }

      if (values['password'] && values['password'].length < 8) {
        newErrors['password'] = 'Password must be at least 8 characters';
      }

      if (termsCheckbox?.required && !termsChecked) {
        newErrors['terms'] = 'You must agree to the terms';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  const switchView = (newView: 'login' | 'register') => {
    setView(newView);
    setValues({});
    setErrors({});
    setSubmitted(false);
    setShowPassword(false);
    setTermsChecked(false);
  };

  const fieldIcon = (fieldName: string) => {
    if (fieldName === 'email') return <Mail size={16} className="text-gray-400" />;
    if (fieldName === 'password') return <Lock size={16} className="text-gray-400" />;
    return <User size={16} className="text-gray-400" />;
  };

  const renderField = (fieldName: string) => {
    const isPassword = fieldName === 'password';
    const error = errors[fieldName];
    const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    return (
      <div key={fieldName} className="w-full">
        <label htmlFor={`auth-${fieldName}`} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            {fieldIcon(fieldName)}
          </span>
          <input
            id={`auth-${fieldName}`}
            type={isPassword ? (showPassword ? 'text' : 'password') : fieldName === 'email' ? 'email' : 'text'}
            value={values[fieldName] ?? ''}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            placeholder={`Enter your ${fieldName}`}
            className={clsx(
              'w-full rounded-md border bg-white py-2.5 pl-10 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
              isPassword ? 'pr-10' : 'pr-3',
              error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400',
            )}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  };

  const socialButtons = showSocialLogin && socialProviders.length > 0 && (
    <>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-500">or continue with</span>
        </div>
      </div>
      <div className={clsx('grid gap-2', socialProviders.length > 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {socialProviders.map((provider) => (
          <button
            key={provider}
            type="button"
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {socialIcons[provider]}
            {socialLabels[provider]}
          </button>
        ))}
      </div>
    </>
  );

  const formContent = submitted ? (
    <div className="py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        {view === 'login' ? 'Welcome back!' : 'Account created!'}
      </h3>
      <p className="text-sm text-gray-600">
        {view === 'login' ? 'You have been logged in successfully.' : 'Your account has been created. Please check your email.'}
      </p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-5 space-y-4">
        {view === 'login' ? (
          <>
            {renderField('email')}
            {renderField('password')}
            {showForgotPassword && (
              <div className="text-right">
                <a href="#" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            {registerFields.map((field) => renderField(field))}
            {termsCheckbox && (
              <div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(e) => {
                      setTermsChecked(e.target.checked);
                      if (errors['terms']) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next['terms'];
                          return next;
                        });
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {termsCheckbox.label}
                    {termsCheckbox.required && <span className="ml-0.5 text-red-500">*</span>}
                  </span>
                </label>
                {errors['terms'] && <p className="mt-1 text-xs text-red-600">{errors['terms']}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={clsx(
          'w-full rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          submitting ? 'cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700',
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : view === 'login' ? (
          'Sign In'
        ) : (
          'Create Account'
        )}
      </button>

      {socialButtons}

      {showToggle && (
        <p className="mt-5 text-center text-sm text-gray-600">
          {view === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => switchView('register')} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => switchView('login')} className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      )}
    </form>
  );

  const heading = (
    <div className="mb-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900">
        {view === 'login' ? 'Welcome back' : 'Create an account'}
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {view === 'login' ? 'Sign in to your account to continue.' : 'Fill in your details to get started.'}
      </p>
    </div>
  );

  // Minimal layout
  if (layout === 'minimal') {
    return (
      <div className={clsx('mx-auto w-full max-w-sm', className)}>
        {heading}
        {formContent}
      </div>
    );
  }

  // Split image layout
  if (layout === 'split-image') {
    return (
      <div className={clsx('flex min-h-[500px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm', className)}>
        <div className="hidden w-1/2 lg:block">
          {splitImage ? (
            <img src={splitImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
              <span className="text-4xl font-bold text-white/30">Welcome</span>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col justify-center p-8 lg:w-1/2 lg:p-12">
          {heading}
          {formContent}
        </div>
      </div>
    );
  }

  // Card layout (default)
  return (
    <div className={clsx('mx-auto w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm', className)}>
      {heading}
      {formContent}
    </div>
  );
};
