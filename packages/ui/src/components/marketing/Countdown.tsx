import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

export interface CountdownLabels {
  days?: string;
  hours?: string;
  minutes?: string;
  seconds?: string;
}

export interface CountdownProps {
  targetDate?: string;
  timezone?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  labels?: CountdownLabels;
  style?: 'boxed' | 'minimal' | 'flip' | 'circular';
  expiredAction?: 'hide' | 'show-message' | 'redirect';
  expiredMessage?: string;
  expiredRedirectUrl?: string | null;
  size?: 'small' | 'medium' | 'large';
  fontColor?: string;
  backgroundColor?: string;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDate: string): TimeRemaining {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isExpired: false,
  };
}

const sizeMap = {
  small: {
    number: 'text-2xl',
    label: 'text-xs',
    gap: 'gap-3',
    pad: 'px-3 py-2',
    circleSize: 60,
    circleStroke: 3,
  },
  medium: {
    number: 'text-4xl',
    label: 'text-sm',
    gap: 'gap-4',
    pad: 'px-4 py-3',
    circleSize: 80,
    circleStroke: 4,
  },
  large: {
    number: 'text-6xl',
    label: 'text-base',
    gap: 'gap-6',
    pad: 'px-6 py-4',
    circleSize: 110,
    circleStroke: 5,
  },
};

function CircularUnit({
  value,
  max,
  label,
  sizeConfig,
  fontColor,
}: {
  value: number;
  max: number;
  label: string;
  sizeConfig: (typeof sizeMap)['medium'];
  fontColor?: string;
}) {
  const radius = (sizeConfig.circleSize - sizeConfig.circleStroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - value / max;
  const offset = circumference * progress;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={sizeConfig.circleSize}
        height={sizeConfig.circleSize}
        className="-rotate-90"
      >
        <circle
          cx={sizeConfig.circleSize / 2}
          cy={sizeConfig.circleSize / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={sizeConfig.circleStroke}
        />
        <circle
          cx={sizeConfig.circleSize / 2}
          cy={sizeConfig.circleSize / 2}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={sizeConfig.circleStroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <span
        className={clsx('font-bold -mt-[calc(50%+0.75rem)] mb-auto', !fontColor && 'text-gray-900', sizeConfig.number)}
        style={fontColor ? { color: fontColor } : undefined}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span
        className={clsx('uppercase tracking-wider', !fontColor && 'text-gray-500', sizeConfig.label)}
        style={fontColor ? { color: fontColor, opacity: 0.7 } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

const INITIAL_TIME: TimeRemaining = { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false };

export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  timezone = 'UTC',
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  labels = {},
  style = 'boxed',
  expiredAction = 'show-message',
  expiredMessage = 'This offer has expired.',
  expiredRedirectUrl = null,
  size = 'medium',
  fontColor,
  backgroundColor,
  className,
}) => {
  // Resolve default target date inside an effect to avoid SSR/client mismatch
  const resolvedTarget = targetDate ?? new Date(Date.now() + 86400000 * 7).toISOString();

  // Initialize with static zeros so server and client render identically;
  // the useEffect below will calculate the real values after mount.
  const [time, setTime] = useState<TimeRemaining>(INITIAL_TIME);
  const [hasRedirected, setHasRedirected] = useState(false);

  const effectiveLabels = {
    days: labels.days ?? 'Days',
    hours: labels.hours ?? 'Hours',
    minutes: labels.minutes ?? 'Minutes',
    seconds: labels.seconds ?? 'Seconds',
  };

  const sizeConfig = sizeMap[size];

  const tick = useCallback(() => {
    setTime(calculateTimeRemaining(resolvedTarget));
  }, [resolvedTarget]);

  useEffect(() => {
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [tick]);

  useEffect(() => {
    if (time.isExpired && expiredAction === 'redirect' && expiredRedirectUrl && !hasRedirected) {
      setHasRedirected(true);
      window.location.href = expiredRedirectUrl;
    }
  }, [time.isExpired, expiredAction, expiredRedirectUrl, hasRedirected]);

  if (time.isExpired) {
    if (expiredAction === 'hide') return null;
    if (expiredAction === 'show-message') {
      return (
        <div className={clsx('text-center text-gray-600', className)}>
          <p className="text-lg">{expiredMessage}</p>
        </div>
      );
    }
    return null;
  }

  const units: { value: number; label: string; max: number; show: boolean }[] = [
    { value: time.days, label: effectiveLabels.days, max: 365, show: showDays },
    { value: time.hours, label: effectiveLabels.hours, max: 24, show: showHours },
    { value: time.minutes, label: effectiveLabels.minutes, max: 60, show: showMinutes },
    { value: time.seconds, label: effectiveLabels.seconds, max: 60, show: showSeconds },
  ].filter((u) => u.show);

  const renderUnit = (unit: { value: number; label: string; max: number }, index: number) => {
    if (style === 'circular') {
      return (
        <CircularUnit
          key={unit.label}
          value={unit.value}
          max={unit.max}
          label={unit.label}
          sizeConfig={sizeConfig}
          fontColor={fontColor}
        />
      );
    }

    const boxBg = backgroundColor || undefined;
    const textColor = fontColor || undefined;

    return (
      <div key={unit.label} className="flex items-center gap-2">
        <div
          className={clsx(
            'flex flex-col items-center',
            style === 'boxed' && clsx('rounded-lg', !backgroundColor && 'bg-gray-900', !fontColor && 'text-white', sizeConfig.pad),
            style === 'flip' && clsx('rounded-lg relative overflow-hidden', !backgroundColor && 'bg-gray-900', !fontColor && 'text-white', sizeConfig.pad),
            style === 'minimal' && (!fontColor && 'text-gray-900'),
          )}
          style={{
            ...((['boxed', 'flip'].includes(style) && boxBg) ? { backgroundColor: boxBg } : {}),
            ...(textColor ? { color: textColor } : {}),
          }}
        >
          <span className={clsx('font-bold tabular-nums leading-none', sizeConfig.number)}>
            {String(unit.value).padStart(2, '0')}
          </span>
          {style === 'flip' && (
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
          )}
        </div>
        <span
          className={clsx('uppercase tracking-wider', !fontColor && 'text-gray-500', sizeConfig.label)}
          style={textColor ? { color: textColor, opacity: 0.7 } : undefined}
        >
          {unit.label}
        </span>
        {style === 'minimal' && index < units.length - 1 && (
          <span
            className={clsx('font-bold mx-1', !fontColor && 'text-gray-400', sizeConfig.number)}
            style={textColor ? { color: textColor, opacity: 0.5 } : undefined}
          >:</span>
        )}
      </div>
    );
  };

  const wrapperBg = (['minimal', 'circular'].includes(style) && backgroundColor) ? backgroundColor : undefined;

  return (
    <div
      className={clsx('flex flex-wrap justify-center', sizeConfig.gap, wrapperBg && 'rounded-lg px-6 py-4', className)}
      style={wrapperBg ? { backgroundColor: wrapperBg } : undefined}
      aria-live="polite"
      aria-atomic="true"
      aria-label="Countdown timer"
    >
      {units.map((unit, index) => renderUnit(unit, index))}
    </div>
  );
};
