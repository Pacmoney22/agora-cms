import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface ModalProps {
  trigger?: 'click' | 'time-delay' | 'scroll-depth' | 'exit-intent';
  timeDelay?: number;
  scrollDepth?: number;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  showOncePerSession?: boolean;
  animation?: 'fade' | 'slide-up' | 'zoom' | 'none';
  backdropColor?: string;
  children?: React.ReactNode;
  className?: string;
}

const MODAL_SHOWN_STORAGE_KEY = 'cms-modal-shown';

const sizeClasses: Record<string, string> = {
  small: 'max-w-sm w-full',
  medium: 'max-w-lg w-full',
  large: 'max-w-3xl w-full',
  fullscreen: 'w-screen h-screen',
};

const animationOpenClasses: Record<string, string> = {
  fade: 'opacity-100',
  'slide-up': 'opacity-100 translate-y-0',
  zoom: 'opacity-100 scale-100',
  none: '',
};

const animationClosedClasses: Record<string, string> = {
  fade: 'opacity-0',
  'slide-up': 'opacity-0 translate-y-8',
  zoom: 'opacity-0 scale-95',
  none: '',
};

export const Modal: React.FC<ModalProps> = ({
  trigger = 'click',
  timeDelay = 3000,
  scrollDepth = 50,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdropClick = true,
  showOncePerSession = false,
  animation = 'fade',
  backdropColor = 'rgba(0, 0, 0, 0.5)',
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const shouldShow = useCallback(() => {
    if (!showOncePerSession) return true;
    try {
      return !sessionStorage.getItem(MODAL_SHOWN_STORAGE_KEY);
    } catch {
      return true;
    }
  }, [showOncePerSession]);

  const openModal = useCallback(() => {
    if (!shouldShow()) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    if (showOncePerSession) {
      try {
        sessionStorage.setItem(MODAL_SHOWN_STORAGE_KEY, 'true');
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [shouldShow, showOncePerSession]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, []);

  // Time-delay trigger
  useEffect(() => {
    if (trigger !== 'time-delay') return;

    const timer = setTimeout(() => {
      openModal();
    }, timeDelay);

    return () => clearTimeout(timer);
  }, [trigger, timeDelay, openModal]);

  // Scroll-depth trigger
  useEffect(() => {
    if (trigger !== 'scroll-depth') return;

    const handleScroll = () => {
      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercent >= scrollDepth) {
        openModal();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trigger, scrollDepth, openModal]);

  // Exit-intent trigger
  useEffect(() => {
    if (trigger !== 'exit-intent') return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        openModal();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [trigger, openModal]);

  // Escape key close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        closeModal();
      }
    },
    [closeOnBackdropClick, closeModal],
  );

  return (
    <>
      {trigger === 'click' && (
        <button
          type="button"
          onClick={openModal}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Open
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ backgroundColor: backdropColor }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={modalRef}
            className={clsx(
              'relative bg-white shadow-2xl transition-all duration-300',
              size !== 'fullscreen' && 'mx-4 rounded-lg',
              sizeClasses[size],
              isOpen ? animationOpenClasses[animation] : animationClosedClasses[animation],
              className,
            )}
          >
            {showCloseButton && (
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}

            <div className={clsx('p-6', size === 'fullscreen' && 'h-full overflow-auto')}>
              {children || (
                <div className="py-8 text-center text-gray-500">
                  <p>Modal content goes here.</p>
                  <p className="mt-1 text-sm">Drop components inside this modal.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
