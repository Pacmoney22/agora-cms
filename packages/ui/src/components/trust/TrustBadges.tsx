import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck } from 'lucide-react';

export interface TrustBadge {
  icon?: string;
  image?: string;
  label: string;
  tooltip?: string;
}

export interface TrustBadgesProps {
  badges?: TrustBadge[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  className?: string;
}

const sizeMap = {
  small: { icon: 24, image: 'h-8 w-8', text: 'text-xs', padding: 'p-2', gap: 'gap-3' },
  medium: { icon: 32, image: 'h-12 w-12', text: 'text-sm', padding: 'p-3', gap: 'gap-4' },
  large: { icon: 40, image: 'h-16 w-16', text: 'text-base', padding: 'p-4', gap: 'gap-6' },
};

export const TrustBadges: React.FC<TrustBadgesProps> = ({
  badges = [],
  layout = 'horizontal',
  size = 'medium',
  showLabels = true,
  className,
}) => {
  const sizeConfig = sizeMap[size];

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-center',
        sizeConfig.gap,
        layout === 'vertical' && 'flex-col',
        layout === 'grid' && 'grid grid-cols-2 md:grid-cols-4',
        className,
      )}
      role="list"
      aria-label="Trust badges"
    >
      {badges.map((badge, index) => (
        <div
          key={index}
          className={clsx(
            'flex flex-col items-center text-center',
            sizeConfig.padding,
          )}
          role="listitem"
          title={badge.tooltip || undefined}
        >
          {badge.image ? (
            <img
              src={badge.image}
              alt={badge.label}
              className={clsx('object-contain', sizeConfig.image)}
            />
          ) : (
            <ShieldCheck
              size={sizeConfig.icon}
              className="text-green-600"
              aria-hidden="true"
            />
          )}
          {showLabels && (
            <span
              className={clsx(
                'mt-1.5 font-medium text-gray-700',
                sizeConfig.text,
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
