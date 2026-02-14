import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Wrench, Send, ExternalLink } from 'lucide-react';

export interface MaintenanceSocialLink {
  platform: string;
  url: string;
}

export interface MaintenancePageProps {
  headline?: string;
  message?: string;
  showCountdown?: boolean;
  countdownTarget?: string | null;
  showNewsletter?: boolean;
  socialLinks?: MaintenanceSocialLink[];
  backgroundColor?: string;
  className?: string;
}

function useCountdown(target: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!target) return;

    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-3xl font-bold text-white backdrop-blur-sm md:h-20 md:w-20 md:text-4xl">
        {String(value).padStart(2, '0')}
      </div>
      <span className="mt-2 text-xs uppercase tracking-wider text-white/60">
        {label}
      </span>
    </div>
  );
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  headline = "We'll Be Back Soon",
  message = 'We are currently performing scheduled maintenance. We should be back online shortly. Thank you for your patience.',
  showCountdown = false,
  countdownTarget = null,
  showNewsletter = true,
  socialLinks = [],
  backgroundColor = '#1e293b',
  className,
}) => {
  const timeLeft = useCountdown(showCountdown ? countdownTarget : null);

  return (
    <div
      className={clsx(
        'flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center',
        className,
      )}
      style={{ backgroundColor }}
    >
      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <Wrench className="h-10 w-10 text-white/80" />
      </div>

      {/* Headline */}
      <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">{headline}</h1>

      {/* Message */}
      <p className="mb-10 max-w-lg text-lg text-white/70">{message}</p>

      {/* Countdown */}
      {showCountdown && countdownTarget && (
        <div className="mb-10 flex gap-4">
          <CountdownUnit value={timeLeft.days} label="Days" />
          <CountdownUnit value={timeLeft.hours} label="Hours" />
          <CountdownUnit value={timeLeft.minutes} label="Minutes" />
          <CountdownUnit value={timeLeft.seconds} label="Seconds" />
        </div>
      )}

      {/* Newsletter */}
      {showNewsletter && (
        <div className="mb-10 w-full max-w-md">
          <p className="mb-3 text-sm text-white/60">
            Get notified when we're back:
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 backdrop-blur-sm focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Email address"
            />
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
              aria-label="Subscribe for updates"
            >
              <Send className="h-4 w-4" />
              Notify Me
            </button>
          </div>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="flex gap-3">
          {socialLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow us on ${link.platform}`}
              className="rounded-full bg-white/10 p-3 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
