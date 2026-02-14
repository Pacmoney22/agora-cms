import React from 'react';
import { clsx } from 'clsx';
import { Search, Home, ArrowRight, AlertTriangle } from 'lucide-react';

export interface ErrorPageLink {
  label: string;
  url: string;
}

export interface ErrorPageProps {
  headline?: string;
  message?: string;
  illustration?: string | null;
  showSearch?: boolean;
  suggestedLinks?: ErrorPageLink[];
  ctaButton?: { label: string; url: string };
  className?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  headline = 'Page Not Found',
  message = "Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.",
  illustration = null,
  showSearch = true,
  suggestedLinks = [],
  ctaButton = { label: 'Go Home', url: '/' },
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center',
        className,
      )}
    >
      {/* Illustration or Default Icon */}
      {illustration ? (
        <img
          src={illustration}
          alt=""
          className="mb-8 h-48 w-auto object-contain"
          aria-hidden="true"
        />
      ) : (
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <AlertTriangle className="h-12 w-12 text-gray-400" />
        </div>
      )}

      {/* Headline */}
      <h1 className="mb-3 text-4xl font-bold text-gray-900">{headline}</h1>

      {/* Message */}
      <p className="mb-8 max-w-md text-lg text-gray-600">{message}</p>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-8 w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search our site..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Search"
            />
          </div>
        </div>
      )}

      {/* CTA Button */}
      <a
        href={ctaButton.url}
        className="mb-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Home className="h-4 w-4" />
        {ctaButton.label}
      </a>

      {/* Suggested Links */}
      {suggestedLinks.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="mb-3 text-sm font-medium text-gray-500">
            Or try one of these pages:
          </p>
          <nav className="flex flex-col gap-2" aria-label="Suggested pages">
            {suggestedLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="group flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors hover:bg-gray-50"
              >
                <span className="font-medium text-gray-700">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};
