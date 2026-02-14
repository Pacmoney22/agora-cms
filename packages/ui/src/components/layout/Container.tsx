import React from 'react';
import { clsx } from 'clsx';

export interface ContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export const Container: React.FC<ContainerProps> = ({
  maxWidth = 'xl',
  padding = '16px',
  backgroundColor,
  children,
  className,
}) => {
  return (
    <div
      className={clsx('mx-auto w-full', maxWidthMap[maxWidth], className)}
      style={{ padding, backgroundColor }}
    >
      {children}
    </div>
  );
};
