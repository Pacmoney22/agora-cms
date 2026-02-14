import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Cookie, X } from 'lucide-react';

export interface CookieConsentProps {
  message?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  customizeLabel?: string;
  showCategories?: boolean;
  position?: 'bottom-bar' | 'bottom-left' | 'bottom-right' | 'center-modal';
  privacyPolicyUrl?: string | null;
  cookieDuration?: number;
  className?: string;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'cms-cookie-consent';

const positionClasses: Record<string, string> = {
  'bottom-bar': 'fixed inset-x-0 bottom-0',
  'bottom-left': 'fixed bottom-4 left-4 max-w-md',
  'bottom-right': 'fixed bottom-4 right-4 max-w-md',
  'center-modal': 'fixed inset-0 flex items-center justify-center',
};

export const CookieConsent: React.FC<CookieConsentProps> = ({
  message = 'We use cookies to improve your experience. By continuing to visit this site you agree to our use of cookies.',
  acceptLabel = 'Accept All',
  rejectLabel = 'Reject All',
  customizeLabel = 'Customize',
  showCategories = false,
  position = 'bottom-bar',
  privacyPolicyUrl = null,
  cookieDuration = 365,
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [categories, setCategories] = useState({
    analytics: true,
    marketing: true,
    preferences: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CookiePreferences = JSON.parse(stored);
        const expiryMs = cookieDuration * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < expiryMs) {
          return;
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }
    setVisible(true);
  }, [cookieDuration]);

  const savePreferences = useCallback((prefs: Omit<CookiePreferences, 'timestamp'>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...prefs, timestamp: Date.now() }),
      );
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }, [savePreferences]);

  const handleRejectAll = useCallback(() => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  }, [savePreferences]);

  const handleSaveCustom = useCallback(() => {
    savePreferences({
      necessary: true,
      ...categories,
    });
  }, [savePreferences, categories]);

  if (!visible) {
    return null;
  }

  const isModal = position === 'center-modal';

  const bannerContent = (
    <div
      className={clsx(
        'rounded-lg bg-white p-6 shadow-2xl',
        isModal && 'max-w-lg w-full mx-4',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <Cookie size={24} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-gray-700">{message}</p>
      </div>

      {privacyPolicyUrl && (
        <a
          href={privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-block text-sm text-blue-600 underline hover:text-blue-800"
        >
          Privacy Policy
        </a>
      )}

      {(showCustomize || showCategories) && showCustomize && (
        <div className="mb-4 space-y-3 rounded-md bg-gray-50 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              disabled
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Necessary</span>
            <span className="text-xs text-gray-500">(always on)</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={categories.analytics}
              onChange={(e) =>
                setCategories((prev) => ({ ...prev, analytics: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Analytics</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={categories.marketing}
              onChange={(e) =>
                setCategories((prev) => ({ ...prev, marketing: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Marketing</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={categories.preferences}
              onChange={(e) =>
                setCategories((prev) => ({ ...prev, preferences: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Preferences</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAcceptAll}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {acceptLabel}
        </button>
        <button
          type="button"
          onClick={handleRejectAll}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {rejectLabel}
        </button>
        {showCategories && !showCustomize && (
          <button
            type="button"
            onClick={() => setShowCustomize(true)}
            className="px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {customizeLabel}
          </button>
        )}
        {showCustomize && (
          <button
            type="button"
            onClick={handleSaveCustom}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Save Preferences
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={clsx(positionClasses[position], 'z-50')} role="dialog" aria-label="Cookie consent">
      {isModal && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleRejectAll}
          aria-hidden="true"
        />
      )}
      <div className={clsx(isModal && 'relative z-10')}>
        {bannerContent}
      </div>
    </div>
  );
};
