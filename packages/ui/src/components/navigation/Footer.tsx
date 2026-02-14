import React from 'react';
import { clsx } from 'clsx';
import { ArrowUp } from 'lucide-react';

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export interface FooterProps {
  logo?: string;
  tagline?: string;
  columns?: FooterColumn[];
  showNewsletter?: boolean;
  socialLinks?: FooterSocialLink[];
  contactInfo?: FooterContactInfo;
  legalLinks?: FooterLink[];
  copyrightText?: string;
  showBackToTop?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const socialIconPaths: Record<string, string> = {
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  twitter: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
  instagram: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zm1.5-4.87h.01M6.5 2h11A4.5 4.5 0 0 1 22 6.5v11a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 17.5v-11A4.5 4.5 0 0 1 6.5 2z',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z',
};

const formatCopyrightText = (text: string): string => {
  return text.replace(/\{year\}/gi, new Date().getFullYear().toString());
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const Footer: React.FC<FooterProps> = ({
  logo,
  tagline,
  columns = [],
  showNewsletter = false,
  socialLinks = [],
  contactInfo,
  legalLinks = [],
  copyrightText = '\u00A9 {year} Company. All rights reserved.',
  showBackToTop = false,
  children,
  className,
}) => {
  return (
    <footer
      className={clsx('w-full bg-gray-900 text-gray-300', className)}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            {logo ? (
              <img src={logo} alt="Site logo" className="mb-4 h-8 w-auto" />
            ) : (
              <span className="mb-4 inline-block text-xl font-bold text-white">
                Logo
              </span>
            )}
            {tagline && (
              <p className="mb-6 max-w-xs text-sm text-gray-400">{tagline}</p>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d={
                          socialIconPaths[social.platform.toLowerCase()] ||
                          'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z'
                        }
                      />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Columns */}
          {columns.map((column) => (
            <div
              key={column.heading}
              className="lg:col-span-2"
            >
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                {column.heading}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.url}
                      className="text-sm text-gray-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          {showNewsletter && (
            <div className="lg:col-span-4">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                Stay Updated
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                Subscribe to our newsletter for the latest updates.
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Subscribe
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Contact Info */}
        {contactInfo && (
          <div className="mt-8 border-t border-gray-800 pt-8">
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              {contactInfo.email && (
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="transition-colors hover:text-white"
                >
                  {contactInfo.email}
                </a>
              )}
              {contactInfo.phone && (
                <a
                  href={`tel:${contactInfo.phone}`}
                  className="transition-colors hover:text-white"
                >
                  {contactInfo.phone}
                </a>
              )}
              {contactInfo.address && (
                <span>{contactInfo.address}</span>
              )}
            </div>
          </div>
        )}

        {children}

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 md:flex-row">
          <p className="text-sm text-gray-500">
            {formatCopyrightText(copyrightText)}
          </p>

          {/* Legal Links */}
          {legalLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              {legalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="text-sm text-gray-500 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 rounded-full bg-gray-700 p-3 text-white shadow-lg transition-colors hover:bg-gray-600"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </footer>
  );
};
