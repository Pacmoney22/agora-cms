import React from 'react';
import { clsx } from 'clsx';

export interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  children?: React.ReactNode;
  className?: string;
}

const sizeMap = {
  1: 'text-4xl md:text-5xl font-bold',
  2: 'text-3xl md:text-4xl font-bold',
  3: 'text-2xl md:text-3xl font-semibold',
  4: 'text-xl md:text-2xl font-semibold',
  5: 'text-lg md:text-xl font-medium',
  6: 'text-base md:text-lg font-medium',
};

export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  text,
  alignment = 'left',
  color,
  children,
  className,
}) => {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return (
    <Tag
      className={clsx(sizeMap[level], `text-${alignment}`, className)}
      style={{ color }}
    >
      {children ?? text}
    </Tag>
  );
};
