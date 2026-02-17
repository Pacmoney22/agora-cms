import React from 'react';
import { clsx } from 'clsx';

export interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius?: string;
  className?: string;
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  objectFit = 'cover',
  borderRadius,
  className,
}) => {
  if (!src) {
    return (
      <div
        className={clsx(
          'flex max-w-full items-center justify-center bg-gray-100 text-sm text-gray-400',
          className,
        )}
        style={{
          width: width ?? '100%',
          height: height ?? 200,
          borderRadius,
        }}
        aria-label={alt || 'No image selected'}
      >
        No image selected
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={clsx('max-w-full', className)}
      style={{ objectFit, borderRadius }}
    />
  );
};
