import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export interface ToastProps {
  trigger?: 'event' | 'time-delay';
  eventName?: string | null;
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  duration?: number;
  showDismiss?: boolean;
  className?: string;
}

const variantStyles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
  },
};

const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
};

export const Toast: React.FC<ToastProps> = ({
  trigger = 'time-delay',
  eventName = null,
  message = 'This is a notification message.',
  variant = 'info',
  position = 'top-right',
  duration = 5000,
  showDismiss = true,
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (trigger === 'time-delay') {
      const showTimer = setTimeout(() => {
        setVisible(true);
      }, 500);

      return () => clearTimeout(showTimer);
    }
  }, [trigger]);

  useEffect(() => {
    if (visible && duration > 0) {
      const hideTimer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(hideTimer);
    }
  }, [visible, duration]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
  };

  if (!visible) return null;

  const styles = variantStyles[variant] ?? variantStyles['info']!;

  return (
    <div
      className={clsx(
        'fixed z-50',
        positionStyles[position],
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={clsx(
          'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300',
          styles.bg,
          styles.border,
          exiting ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
        )}
        style={{ minWidth: '300px', maxWidth: '420px' }}
      >
        <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
        <p className={clsx('flex-1 text-sm', styles.text)}>{message}</p>
        {showDismiss && (
          <button
            onClick={dismiss}
            className={clsx(
              'flex-shrink-0 rounded p-0.5 transition-colors hover:bg-black/5',
              styles.text,
            )}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
