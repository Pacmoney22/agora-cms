import React from 'react';
import { clsx } from 'clsx';

export interface HeroBannerProps {
  headline?: string;
  subheadline?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  cta?: {
    label: string;
    url: string;
    style: 'primary' | 'secondary' | 'ghost';
  };
  layout?: 'left-aligned' | 'centered' | 'right-aligned';
  minHeight?: string;
  children?: React.ReactNode;
  className?: string;
}

const layoutMap = {
  'left-aligned': 'items-start text-left',
  centered: 'items-center text-center',
  'right-aligned': 'items-end text-right',
};

const ctaStyleMap = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300',
  ghost: 'text-white hover:bg-white/10 border border-white',
};

export const HeroBanner: React.FC<HeroBannerProps> = ({
  headline = 'Your Headline Here',
  subheadline = 'Supporting text goes here',
  backgroundImage,
  backgroundColor = '#1e293b',
  cta,
  layout = 'centered',
  minHeight = '500px',
  children,
  className,
}) => {
  return (
    <div
      className={clsx(
        'relative flex w-full flex-col justify-center px-8 py-16',
        layoutMap[layout],
        className,
      )}
      style={{
        minHeight,
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 max-w-3xl">
        <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">{headline}</h1>
        {subheadline && (
          <p className="mb-8 text-lg text-white/90 md:text-xl">{subheadline}</p>
        )}
        {cta && (
          <a
            href={cta.url}
            className={clsx(
              'inline-block rounded-md px-6 py-3 font-medium transition-colors',
              ctaStyleMap[cta.style],
            )}
          >
            {cta.label}
          </a>
        )}
        {children}
      </div>
    </div>
  );
};
