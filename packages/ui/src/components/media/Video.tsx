import React, { useMemo } from 'react';
import { clsx } from 'clsx';

export interface VideoProps {
  source: 'youtube' | 'vimeo' | 'self-hosted';
  url: string;
  posterImage?: string | null;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | '21:9';
  maxWidth?: 'small' | 'medium' | 'large' | 'full';
  caption?: string | null;
  privacyMode?: boolean;
  className?: string;
}

const aspectRatioMap: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
  '9:16': 'aspect-[9/16]',
  '21:9': 'aspect-[21/9]',
};

const maxWidthMap: Record<string, string> = {
  small: 'max-w-sm',
  medium: 'max-w-2xl',
  large: 'max-w-5xl',
  full: 'max-w-full',
};

function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

function parseVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/)(\d+)/);
  return match ? match[1] ?? null : null;
}

export const Video: React.FC<VideoProps> = ({
  source,
  url,
  posterImage = null,
  autoplay = false,
  muted = false,
  loop = false,
  controls = true,
  aspectRatio = '16:9',
  maxWidth = 'full',
  caption = null,
  privacyMode = false,
  className,
}) => {
  const iframeSrc = useMemo(() => {
    if (source === 'youtube') {
      const videoId = parseYouTubeId(url);
      if (!videoId) return null;
      const domain = privacyMode
        ? 'www.youtube-nocookie.com'
        : 'www.youtube.com';
      const params = new URLSearchParams();
      if (autoplay) params.set('autoplay', '1');
      if (muted) params.set('mute', '1');
      if (loop) {
        params.set('loop', '1');
        params.set('playlist', videoId);
      }
      if (!controls) params.set('controls', '0');
      return `https://${domain}/embed/${videoId}?${params.toString()}`;
    }

    if (source === 'vimeo') {
      const videoId = parseVimeoId(url);
      if (!videoId) return null;
      const params = new URLSearchParams();
      if (autoplay) params.set('autoplay', '1');
      if (muted) params.set('muted', '1');
      if (loop) params.set('loop', '1');
      return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
    }

    return null;
  }, [source, url, autoplay, muted, loop, controls, privacyMode]);

  const renderPlayer = () => {
    if (source === 'self-hosted') {
      return (
        <video
          src={url}
          poster={posterImage || undefined}
          autoPlay={autoplay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      );
    }

    if (!iframeSrc) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          Invalid video URL
        </div>
      );
    }

    return (
      <iframe
        src={iframeSrc}
        title={caption || 'Embedded video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  };

  return (
    <figure className={clsx('w-full', maxWidthMap[maxWidth], className)}>
      <div
        className={clsx(
          'relative w-full overflow-hidden bg-black',
          aspectRatioMap[aspectRatio],
        )}
      >
        {renderPlayer()}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
