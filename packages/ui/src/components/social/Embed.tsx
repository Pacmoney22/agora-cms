import React from 'react';
import { clsx } from 'clsx';
import { Play } from 'lucide-react';

export type EmbedType =
  | 'auto'
  | 'youtube'
  | 'vimeo'
  | 'twitter'
  | 'instagram'
  | 'codepen'
  | 'google-maps'
  | 'spotify'
  | 'custom-iframe';

export interface EmbedProps {
  embedUrl?: string;
  embedType?: EmbedType;
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'auto';
  maxWidth?: 'small' | 'medium' | 'large' | 'full';
  caption?: string | null;
  lazyLoad?: boolean;
  className?: string;
}

function detectEmbedType(url: string): EmbedType {
  if (!url) return 'custom-iframe';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('codepen.io')) return 'codepen';
  if (lower.includes('google.com/maps') || lower.includes('maps.google')) return 'google-maps';
  if (lower.includes('spotify.com')) return 'spotify';
  return 'custom-iframe';
}

function getEmbedUrl(url: string, type: EmbedType): string {
  if (!url) return '';

  switch (type) {
    case 'youtube': {
      const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
      );
      return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    }
    case 'vimeo': {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : url;
    }
    case 'spotify': {
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    case 'codepen': {
      return url.replace('/pen/', '/embed/');
    }
    default:
      return url;
  }
}

const aspectRatioMap: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
  auto: '',
};

const maxWidthMap: Record<string, string> = {
  small: 'max-w-sm',
  medium: 'max-w-2xl',
  large: 'max-w-5xl',
  full: 'max-w-full',
};

export const Embed: React.FC<EmbedProps> = ({
  embedUrl = '',
  embedType = 'auto',
  aspectRatio = '16:9',
  maxWidth = 'full',
  caption = null,
  lazyLoad = true,
  className,
}) => {
  const resolvedType = embedType === 'auto' ? detectEmbedType(embedUrl) : embedType;
  const resolvedUrl = getEmbedUrl(embedUrl, resolvedType);

  if (!embedUrl) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50',
          aspectRatioMap['16:9'],
          maxWidthMap[maxWidth],
          className,
        )}
      >
        <div className="text-center text-gray-400">
          <Play className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">Add an embed URL to display content</p>
        </div>
      </div>
    );
  }

  return (
    <figure className={clsx('w-full', maxWidthMap[maxWidth], className)}>
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-lg',
          aspectRatioMap[aspectRatio],
        )}
      >
        <iframe
          src={resolvedUrl}
          title={`Embedded ${resolvedType} content`}
          className={clsx(
            'border-0',
            aspectRatio !== 'auto' ? 'absolute inset-0 h-full w-full' : 'h-96 w-full',
          )}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading={lazyLoad ? 'lazy' : undefined}
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
