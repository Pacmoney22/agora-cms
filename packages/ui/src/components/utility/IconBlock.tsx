import React from 'react';
import { clsx } from 'clsx';
import * as LucideIcons from 'lucide-react';

export interface IconBlockProps {
  icon?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  backgroundStyle?: 'none' | 'circle' | 'square';
  link?: string | null;
  decorative?: boolean;
  ariaLabel?: string | null;
  className?: string;
}

const sizeMap: Record<string, number> = {
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 48,
};

const backgroundPadding: Record<string, string> = {
  small: 'p-2',
  medium: 'p-3',
  large: 'p-4',
  xlarge: 'p-5',
};

export const IconBlock: React.FC<IconBlockProps> = ({
  icon = 'Star',
  size = 'medium',
  color = '#374151',
  backgroundStyle = 'none',
  link = null,
  decorative = true,
  ariaLabel = null,
  className,
}) => {
  const IconComponent = (LucideIcons as unknown as Record<string, React.FC<{ size?: number; color?: string; className?: string }>>)[icon];

  if (!IconComponent) {
    return null;
  }

  const pixelSize = sizeMap[size];

  const iconElement = (
    <IconComponent size={pixelSize} color={color} className="shrink-0" />
  );

  const wrappedIcon = backgroundStyle !== 'none' ? (
    <span
      className={clsx(
        'inline-flex items-center justify-center bg-gray-100',
        backgroundPadding[size],
        backgroundStyle === 'circle' && 'rounded-full',
        backgroundStyle === 'square' && 'rounded-lg',
      )}
    >
      {iconElement}
    </span>
  ) : (
    iconElement
  );

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { 'aria-label': ariaLabel || icon, role: 'img' as const };

  if (link) {
    return (
      <a
        href={link}
        className={clsx('inline-flex items-center transition-opacity hover:opacity-75', className)}
        {...accessibilityProps}
      >
        {wrappedIcon}
      </a>
    );
  }

  return (
    <span
      className={clsx('inline-flex items-center', className)}
      {...accessibilityProps}
    >
      {wrappedIcon}
    </span>
  );
};
