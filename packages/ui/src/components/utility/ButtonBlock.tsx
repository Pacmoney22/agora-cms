import React from 'react';
import { clsx } from 'clsx';
import * as LucideIcons from 'lucide-react';

export interface ButtonBlockProps {
  label?: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string | null;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  openInNewTab?: boolean;
  alignment?: 'left' | 'center' | 'right';
  className?: string;
}

const styleClasses: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 border border-gray-600',
  outline: 'bg-transparent text-blue-600 hover:bg-blue-50 border border-blue-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent',
  link: 'bg-transparent text-blue-600 hover:text-blue-800 underline border-0 px-0 py-0',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
};

const sizeClasses: Record<string, string> = {
  small: 'px-3 py-1.5 text-sm',
  medium: 'px-5 py-2.5 text-base',
  large: 'px-7 py-3.5 text-lg',
};

const alignmentClasses: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export const ButtonBlock: React.FC<ButtonBlockProps> = ({
  label = 'Click me',
  url = '#',
  style = 'primary',
  size = 'medium',
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  openInNewTab = false,
  alignment = 'left',
  className,
}) => {
  const IconComponent = icon
    ? (LucideIcons as unknown as Record<string, React.FC<{ size?: number; className?: string }>>)[icon]
    : null;

  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  return (
    <div className={clsx('flex w-full', alignmentClasses[alignment], className)}>
      <a
        href={url}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          styleClasses[style],
          style !== 'link' && sizeClasses[size],
          fullWidth && 'w-full justify-center',
        )}
      >
        {IconComponent && iconPosition === 'left' && (
          <IconComponent size={iconSize} className="shrink-0" />
        )}
        <span>{label}</span>
        {IconComponent && iconPosition === 'right' && (
          <IconComponent size={iconSize} className="shrink-0" />
        )}
      </a>
    </div>
  );
};
