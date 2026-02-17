import React from 'react';
import { clsx } from 'clsx';
import * as LucideIcons from 'lucide-react';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  link?: string;
}

export interface FeatureGridProps {
  features?: FeatureItem[];
  columns?: 2 | 3 | 4;
  iconStyle?: 'plain' | 'circle-bg' | 'square-bg' | 'outline';
  iconSize?: 'small' | 'medium' | 'large';
  iconColor?: string;
  alignment?: 'left' | 'center';
  showDividers?: boolean;
  titleLevel?: 'h3' | 'h4' | 'h5';
  className?: string;
}

const iconSizeMap = {
  small: 20,
  medium: 28,
  large: 36,
};

const iconContainerSizeMap = {
  small: 'h-10 w-10',
  medium: 'h-14 w-14',
  large: 'h-18 w-18',
};

const columnsMap = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

function getLucideIcon(name: string): React.ElementType | null {
  const icons = LucideIcons as unknown as Record<string, unknown>;
  // Try exact name first (PascalCase from icon picker)
  const exact = icons[name];
  if (exact && (typeof exact === 'function' || typeof exact === 'object')) {
    return exact as React.ElementType;
  }
  // Try converting dash-case to PascalCase
  const formatted = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const converted = icons[formatted];
  if (converted && (typeof converted === 'function' || typeof converted === 'object')) {
    return converted as React.ElementType;
  }
  return null;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  features = [],
  columns = 3,
  iconStyle = 'plain',
  iconSize = 'medium',
  iconColor = '#3b82f6',
  alignment = 'center',
  showDividers = false,
  titleLevel = 'h3',
  className,
}) => {
  const TitleTag = titleLevel;

  const titleSizeMap: Record<string, string> = {
    h3: 'text-lg font-semibold',
    h4: 'text-base font-semibold',
    h5: 'text-sm font-semibold',
  };

  return (
    <div
      className={clsx(
        'grid w-full gap-8',
        columnsMap[columns],
        className,
      )}
    >
      {features.map((feature, index) => {
        const isImageIcon = feature.icon && (feature.icon.startsWith('http') || feature.icon.startsWith('/'));
        const IconComponent = !isImageIcon ? getLucideIcon(feature.icon) : null;

        const iconElement = isImageIcon ? (
          <img
            src={feature.icon}
            alt=""
            className="rounded object-cover"
            style={{ width: iconSizeMap[iconSize], height: iconSizeMap[iconSize] }}
          />
        ) : IconComponent ? (
          <IconComponent
            size={iconSizeMap[iconSize]}
            style={{ color: iconColor }}
          />
        ) : null;

        const wrappedIcon = (
          <div
            className={clsx(
              'inline-flex items-center justify-center shrink-0',
              iconContainerSizeMap[iconSize],
              iconStyle === 'circle-bg' && 'rounded-full',
              iconStyle === 'square-bg' && 'rounded-lg',
              iconStyle === 'outline' && 'rounded-lg border-2',
              (iconStyle === 'circle-bg' || iconStyle === 'square-bg') && 'bg-opacity-10',
            )}
            style={{
              backgroundColor:
                iconStyle === 'circle-bg' || iconStyle === 'square-bg'
                  ? `${iconColor}1a`
                  : undefined,
              borderColor: iconStyle === 'outline' ? iconColor : undefined,
            }}
          >
            {iconElement}
          </div>
        );

        const content = (
          <div
            className={clsx(
              'flex flex-col gap-3 p-4',
              alignment === 'center' ? 'items-center text-center' : 'items-start text-left',
              showDividers && index !== features.length - 1 && 'border-b border-gray-200 pb-8 md:border-b-0 md:border-r md:pb-4 md:pr-8',
            )}
          >
            {wrappedIcon}
            <TitleTag className={clsx(titleSizeMap[titleLevel], 'text-gray-900')}>
              {feature.title}
            </TitleTag>
            <p className="text-sm text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        );

        if (feature.link) {
          return (
            <a
              key={index}
              href={feature.link}
              className="group rounded-lg transition-shadow hover:shadow-md"
            >
              {content}
            </a>
          );
        }

        return (
          <div key={index}>
            {content}
          </div>
        );
      })}
    </div>
  );
};
