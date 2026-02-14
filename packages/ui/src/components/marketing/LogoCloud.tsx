import React from 'react';
import { clsx } from 'clsx';

export interface Logo {
  image: string;
  alt: string;
  url?: string;
}

export interface LogoCloudProps {
  heading?: string;
  logos?: Logo[];
  style?: 'static' | 'scroll' | 'grid';
  grayscale?: boolean;
  maxLogoHeight?: number;
  scrollSpeed?: number;
  className?: string;
}

const marqueeKeyframes = `
@keyframes logo-cloud-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

function LogoImage({
  logo,
  maxHeight,
  grayscale,
}: {
  logo: Logo;
  maxHeight: number;
  grayscale: boolean;
}) {
  const img = (
    <img
      src={logo.image}
      alt={logo.alt}
      className={clsx(
        'object-contain transition-all duration-300',
        grayscale && 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100',
      )}
      style={{ maxHeight: `${maxHeight}px` }}
    />
  );

  if (logo.url) {
    return (
      <a
        href={logo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center px-6 py-4"
      >
        {img}
      </a>
    );
  }

  return (
    <div className="flex items-center justify-center px-6 py-4">
      {img}
    </div>
  );
}

function StaticLayout({ logos, maxHeight, grayscale }: { logos: Logo[]; maxHeight: number; grayscale: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      {logos.map((logo, index) => (
        <LogoImage key={index} logo={logo} maxHeight={maxHeight} grayscale={grayscale} />
      ))}
    </div>
  );
}

function ScrollLayout({
  logos,
  maxHeight,
  grayscale,
  scrollSpeed,
}: {
  logos: Logo[];
  maxHeight: number;
  grayscale: boolean;
  scrollSpeed: number;
}) {
  const duplicatedLogos = [...logos, ...logos];
  const duration = Math.max(5, 100 / scrollSpeed);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: marqueeKeyframes }} />
      <div className="overflow-hidden">
        <div
          className="flex items-center"
          style={{
            animation: `logo-cloud-scroll ${duration}s linear infinite`,
            width: 'max-content',
          }}
        >
          {duplicatedLogos.map((logo, index) => (
            <LogoImage key={index} logo={logo} maxHeight={maxHeight} grayscale={grayscale} />
          ))}
        </div>
      </div>
    </>
  );
}

function GridLayout({ logos, maxHeight, grayscale }: { logos: Logo[]; maxHeight: number; grayscale: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {logos.map((logo, index) => (
        <LogoImage key={index} logo={logo} maxHeight={maxHeight} grayscale={grayscale} />
      ))}
    </div>
  );
}

export const LogoCloud: React.FC<LogoCloudProps> = ({
  heading = '',
  logos = [],
  style = 'static',
  grayscale = true,
  maxLogoHeight = 40,
  scrollSpeed = 30,
  className,
}) => {
  if (logos.length === 0) return null;

  return (
    <div className={clsx('w-full py-8', className)}>
      {heading && (
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-gray-500">
          {heading}
        </p>
      )}

      {style === 'static' && (
        <StaticLayout logos={logos} maxHeight={maxLogoHeight} grayscale={grayscale} />
      )}
      {style === 'scroll' && (
        <ScrollLayout logos={logos} maxHeight={maxLogoHeight} grayscale={grayscale} scrollSpeed={scrollSpeed} />
      )}
      {style === 'grid' && (
        <GridLayout logos={logos} maxHeight={maxLogoHeight} grayscale={grayscale} />
      )}
    </div>
  );
};
