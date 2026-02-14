import React from 'react';
import { clsx } from 'clsx';

export interface BackgroundVideoOverlay {
  color: string;
  opacity: number;
}

export interface BackgroundVideoProps {
  videoUrl: string;
  fallbackImage: string;
  overlay?: BackgroundVideoOverlay;
  minHeight?: 'small' | 'medium' | 'large' | 'viewport';
  contentAlignment?:
    | 'top-left'
    | 'top-center'
    | 'center'
    | 'bottom-left'
    | 'bottom-center';
  playbackSpeed?: number;
  children?: React.ReactNode;
  className?: string;
}

const minHeightMap: Record<string, string> = {
  small: 'min-h-[300px]',
  medium: 'min-h-[500px]',
  large: 'min-h-[700px]',
  viewport: 'min-h-screen',
};

const alignmentMap: Record<string, string> = {
  'top-left': 'items-start justify-start',
  'top-center': 'items-start justify-center',
  center: 'items-center justify-center',
  'bottom-left': 'items-end justify-start',
  'bottom-center': 'items-end justify-center',
};

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  videoUrl,
  fallbackImage,
  overlay = { color: '#000000', opacity: 0.4 },
  minHeight = 'medium',
  contentAlignment = 'center',
  playbackSpeed = 1.0,
  children,
  className,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = Math.max(0.25, Math.min(2.0, playbackSpeed));
    }
  }, [playbackSpeed]);

  return (
    <div
      className={clsx(
        'relative w-full overflow-hidden',
        minHeightMap[minHeight],
        className,
      )}
    >
      {/* Fallback image for mobile / reduced motion */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: `url(${fallbackImage})` }}
        aria-hidden="true"
      />

      {/* Fallback for prefers-reduced-motion */}
      <style>
        {`@media (prefers-reduced-motion: reduce) {
          .bg-video-element { display: none !important; }
          .bg-video-fallback-motion { display: block !important; }
        }`}
      </style>
      <div
        className="bg-video-fallback-motion absolute inset-0 hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${fallbackImage})` }}
        aria-hidden="true"
      />

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="bg-video-element absolute inset-0 hidden h-full w-full object-cover md:block"
        aria-hidden="true"
      >
        <source src={videoUrl} />
      </video>

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: overlay.color,
          opacity: Math.max(0, Math.min(1, overlay.opacity)),
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={clsx(
          'relative z-10 flex w-full p-6 md:p-10',
          minHeightMap[minHeight],
          alignmentMap[contentAlignment],
        )}
      >
        <div className="max-w-4xl">{children}</div>
      </div>
    </div>
  );
};
