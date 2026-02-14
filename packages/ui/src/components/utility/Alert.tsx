import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface AlertProps {
  message?: string;
  title?: string | null;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  icon?: 'auto' | string | 'none';
  dismissible?: boolean;
  bordered?: boolean;
  className?: string;
}

const autoIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const variantClasses: Record<string, string> = {
  info: 'bg-blue-50 text-blue-800',
  success: 'bg-green-50 text-green-800',
  warning: 'bg-yellow-50 text-yellow-800',
  danger: 'bg-red-50 text-red-800',
};

const borderClasses: Record<string, string> = {
  info: 'border-blue-300',
  success: 'border-green-300',
  warning: 'border-yellow-300',
  danger: 'border-red-300',
};

const iconColorClasses: Record<string, string> = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
};

export const Alert: React.FC<AlertProps> = ({
  message = 'This is an alert message.',
  title = null,
  variant = 'info',
  icon = 'auto',
  dismissible = false,
  bordered = true,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  let IconComponent: React.FC<{ size?: number; className?: string }> | null = null;

  if (icon === 'auto') {
    IconComponent = autoIcons[variant] ?? null;
  } else if (icon !== 'none' && icon) {
    IconComponent = (LucideIcons as unknown as Record<string, React.FC<{ size?: number; className?: string }>>)[icon] || null;
  }

  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={clsx(
        'relative flex w-full items-start gap-3 rounded-lg p-4',
        variantClasses[variant],
        bordered && `border ${borderClasses[variant]}`,
        className,
      )}
    >
      {IconComponent && (
        <span className={clsx('mt-0.5 shrink-0', iconColorClasses[variant])}>
          <IconComponent size={20} />
        </span>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <p className="mb-1 font-semibold">{title}</p>
        )}
        <p className="text-sm">{message}</p>
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
