import React from 'react';
import { clsx } from 'clsx';
import { Quote } from 'lucide-react';

export interface BlockquoteProps {
  quote?: string;
  attribution?: string;
  attributionTitle?: string;
  attributionImage?: string;
  style?: 'border-left' | 'large-quote' | 'card' | 'centered';
  accentColor?: string;
  citationUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

const styleMap = {
  'border-left': 'border-l-4 pl-6 py-2',
  'large-quote': 'relative pl-12 py-4',
  card: 'rounded-lg border border-gray-200 bg-gray-50 p-6 shadow-sm',
  centered: 'text-center py-8 px-6',
};

export const Blockquote: React.FC<BlockquoteProps> = ({
  quote = '',
  attribution,
  attributionTitle,
  attributionImage,
  style = 'border-left',
  accentColor,
  citationUrl,
  children,
  className,
}) => {
  const borderStyle =
    style === 'border-left' && accentColor
      ? { borderLeftColor: accentColor }
      : undefined;

  return (
    <figure className={clsx('my-6', className)}>
      <blockquote
        className={clsx(styleMap[style])}
        style={borderStyle}
        cite={citationUrl || undefined}
      >
        {style === 'large-quote' && (
          <Quote
            className="absolute left-0 top-2 h-8 w-8 opacity-30"
            style={accentColor ? { color: accentColor } : undefined}
          />
        )}

        {style === 'centered' && (
          <Quote
            className="mx-auto mb-4 h-10 w-10 opacity-20"
            style={accentColor ? { color: accentColor } : undefined}
          />
        )}

        <p
          className={clsx(
            'text-gray-800',
            style === 'large-quote' && 'text-xl md:text-2xl font-medium italic leading-relaxed',
            style === 'border-left' && 'text-lg italic leading-relaxed',
            style === 'card' && 'text-lg italic leading-relaxed',
            style === 'centered' && 'text-xl md:text-2xl font-medium italic leading-relaxed',
          )}
          style={style === 'centered' && accentColor ? { color: accentColor } : undefined}
        >
          {quote}
        </p>
        {children}
      </blockquote>

      {(attribution || attributionTitle || attributionImage) && (
        <figcaption
          className={clsx(
            'mt-4 flex items-center gap-3',
            style === 'border-left' && 'pl-6',
            style === 'large-quote' && 'pl-12',
            style === 'card' && 'px-6 pb-2',
            style === 'centered' && 'justify-center',
          )}
        >
          {attributionImage && (
            <img
              src={attributionImage}
              alt={attribution || ''}
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
          <div>
            {attribution && (
              <cite className="not-italic text-sm font-semibold text-gray-900">
                {citationUrl ? (
                  <a
                    href={citationUrl}
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attribution}
                  </a>
                ) : (
                  attribution
                )}
              </cite>
            )}
            {attributionTitle && (
              <p className="text-sm text-gray-500">{attributionTitle}</p>
            )}
          </div>
        </figcaption>
      )}
    </figure>
  );
};
