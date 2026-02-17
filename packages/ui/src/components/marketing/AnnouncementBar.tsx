import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface AnnouncementSchedule {
  startDate?: string;
  endDate?: string;
}

export interface AnnouncementBarProps {
  message?: string;
  backgroundColor?: string;
  textColor?: string;
  dismissible?: boolean;
  link?: string | null;
  icon?: string | null;
  position?: 'top' | 'bottom';
  schedule?: AnnouncementSchedule | null;
  className?: string;
}

function getLucideIcon(name: string): React.ElementType | null {
  const formatted = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return (LucideIcons as unknown as Record<string, React.ElementType>)[formatted] ?? null;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  message = 'Welcome to our site!',
  backgroundColor = '#1e40af',
  textColor = '#ffffff',
  dismissible = true,
  link = null,
  icon = null,
  position = 'top',
  schedule = null,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);
  // Default to visible so server and client render identically;
  // check the schedule after mount to avoid hydration mismatch from Date.now().
  const [isWithinSchedule, setIsWithinSchedule] = useState(true);

  useEffect(() => {
    if (!schedule) return;
    const now = Date.now();
    const beforeStart = schedule.startDate && new Date(schedule.startDate).getTime() > now;
    const afterEnd = schedule.endDate && new Date(schedule.endDate).getTime() < now;
    if (beforeStart || afterEnd) {
      setIsWithinSchedule(false);
    }
  }, [schedule]);

  if (dismissed || !isWithinSchedule) return null;

  const IconComponent = icon ? getLucideIcon(icon) : null;

  const content = (
    <span className="flex items-center justify-center gap-2">
      {IconComponent && <IconComponent size={16} />}
      <span className="text-sm font-medium">{message}</span>
    </span>
  );

  return (
    <div
      role="alert"
      className={clsx(
        'fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5',
        position === 'top' ? 'top-0' : 'bottom-0',
        className,
      )}
      style={{ backgroundColor, color: textColor }}
    >
      {link ? (
        <a
          href={link}
          className="underline-offset-2 hover:underline"
          style={{ color: textColor }}
        >
          {content}
        </a>
      ) : (
        content
      )}

      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss announcement"
          style={{ color: textColor }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
