import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Menu, X, Search, ShoppingCart, User } from 'lucide-react';

export interface HeaderTopBar {
  message: string;
  backgroundColor: string;
  textColor: string;
}

export interface HeaderCtaButton {
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'ghost';
}

export interface HeaderProps {
  logo?: string;
  logoLink?: string;
  navigationMenu?: string;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  ctaButton?: HeaderCtaButton | null;
  sticky?: boolean;
  transparentOnHero?: boolean;
  backgroundColor?: string;
  textColor?: string;
  mobileMenuStyle?: 'slide-left' | 'slide-right' | 'fullscreen' | 'dropdown';
  topBar?: HeaderTopBar | null;
  children?: React.ReactNode;
  className?: string;
}

const ctaStyleMap = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300',
  ghost: 'text-current hover:bg-black/10 border border-current',
};

const mobileMenuPositionMap = {
  'slide-left': 'fixed inset-y-0 left-0 w-80 transform -translate-x-full transition-transform duration-300 ease-in-out',
  'slide-right': 'fixed inset-y-0 right-0 w-80 transform translate-x-full transition-transform duration-300 ease-in-out',
  fullscreen: 'fixed inset-0 transform scale-95 opacity-0 transition-all duration-300 ease-in-out',
  dropdown: 'absolute left-0 right-0 top-full transform -translate-y-2 opacity-0 transition-all duration-300 ease-in-out',
};

const mobileMenuOpenMap = {
  'slide-left': 'translate-x-0',
  'slide-right': 'translate-x-0',
  fullscreen: 'scale-100 opacity-100',
  dropdown: 'translate-y-0 opacity-100',
};

export const Header: React.FC<HeaderProps> = ({
  logo,
  logoLink = '/',
  navigationMenu,
  showSearch = false,
  showCart = false,
  showAccount = false,
  ctaButton = null,
  sticky = false,
  transparentOnHero = false,
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  mobileMenuStyle = 'slide-right',
  topBar = null,
  children,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  return (
    <>
      {/* Skip navigation link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>

      <header
        className={clsx(
          'w-full z-50',
          sticky && 'sticky top-0',
          transparentOnHero && 'absolute',
          className,
        )}
        style={{
          backgroundColor: transparentOnHero ? 'transparent' : backgroundColor,
          color: textColor,
        }}
      >
        {/* Top Bar */}
        {topBar && (
          <div
            className="w-full px-4 py-2 text-center text-sm"
            style={{
              backgroundColor: topBar.backgroundColor,
              color: topBar.textColor,
            }}
          >
            {topBar.message}
          </div>
        )}

        {/* Main Navigation */}
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8"
        >
          {/* Logo */}
          <a href={logoLink} className="flex-shrink-0" aria-label="Home">
            {logo ? (
              <img src={logo} alt="Site logo" className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-bold">Logo</span>
            )}
          </a>

          {/* Desktop Navigation Placeholder */}
          <div className="hidden items-center gap-6 lg:flex">
            {children}
          </div>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 lg:flex">
            {showSearch && (
              <button
                type="button"
                aria-label="Search"
                className="rounded-md p-2 transition-colors hover:bg-black/10"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            {showAccount && (
              <button
                type="button"
                aria-label="Account"
                className="rounded-md p-2 transition-colors hover:bg-black/10"
              >
                <User className="h-5 w-5" />
              </button>
            )}
            {showCart && (
              <button
                type="button"
                aria-label="Cart"
                className="rounded-md p-2 transition-colors hover:bg-black/10"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
            )}
            {ctaButton && (
              <a
                href={ctaButton.url}
                className={clsx(
                  'inline-block rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  ctaStyleMap[ctaButton.style],
                )}
              >
                {ctaButton.label}
              </a>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={toggleMobileMenu}
            className="rounded-md p-2 transition-colors hover:bg-black/10 lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && mobileMenuStyle !== 'dropdown' && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={toggleMobileMenu}
            aria-hidden="true"
          />
        )}

        {/* Mobile Menu Panel */}
        <div
          className={clsx(
            'z-50 lg:hidden',
            mobileMenuPositionMap[mobileMenuStyle],
            mobileMenuOpen && mobileMenuOpenMap[mobileMenuStyle],
          )}
          style={{ backgroundColor }}
          role="dialog"
          aria-modal={mobileMenuOpen}
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-4 p-6">
            {/* Mobile Close for slide/fullscreen */}
            {mobileMenuStyle !== 'dropdown' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={toggleMobileMenu}
                  className="rounded-md p-2 transition-colors hover:bg-black/10"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Mobile Navigation Placeholder */}
            {children}

            {/* Mobile Actions */}
            <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
              {showSearch && (
                <button
                  type="button"
                  aria-label="Search"
                  className="rounded-md p-2 transition-colors hover:bg-black/10"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              {showAccount && (
                <button
                  type="button"
                  aria-label="Account"
                  className="rounded-md p-2 transition-colors hover:bg-black/10"
                >
                  <User className="h-5 w-5" />
                </button>
              )}
              {showCart && (
                <button
                  type="button"
                  aria-label="Cart"
                  className="rounded-md p-2 transition-colors hover:bg-black/10"
                >
                  <ShoppingCart className="h-5 w-5" />
                </button>
              )}
            </div>

            {ctaButton && (
              <a
                href={ctaButton.url}
                className={clsx(
                  'mt-2 block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors',
                  ctaStyleMap[ctaButton.style],
                )}
              >
                {ctaButton.label}
              </a>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
