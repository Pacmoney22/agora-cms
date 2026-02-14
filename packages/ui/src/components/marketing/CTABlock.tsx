import React from 'react';
import { clsx } from 'clsx';

export interface CTABlockProps {
  heading?: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  buttonStyle?: 'primary' | 'secondary';
  alignment?: 'left' | 'center';
  backgroundColor?: string;
  className?: string;
}

export const CTABlock: React.FC<CTABlockProps> = ({
  heading = 'Ready to get started?',
  description = 'Join thousands of satisfied customers today.',
  buttonLabel = 'Get Started',
  buttonUrl = '#',
  buttonStyle = 'primary',
  alignment = 'center',
  backgroundColor = '#f8fafc',
  className,
}) => {
  return (
    <div
      className={clsx(
        'w-full rounded-lg px-8 py-12',
        alignment === 'center' ? 'text-center' : 'text-left',
        className,
      )}
      style={{ backgroundColor }}
    >
      <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">{heading}</h2>
      {description && (
        <p className="mb-6 text-lg text-gray-600">{description}</p>
      )}
      <a
        href={buttonUrl}
        className={clsx(
          'inline-block rounded-md px-6 py-3 font-medium transition-colors',
          buttonStyle === 'primary'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300',
        )}
      >
        {buttonLabel}
      </a>
    </div>
  );
};
