import React from 'react';
import { clsx } from 'clsx';

export interface ParagraphProps {
  text?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  color?: string;
  children?: React.ReactNode;
  className?: string;
}

const fontSizeMap = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export const Paragraph: React.FC<ParagraphProps> = ({
  text,
  alignment = 'left',
  fontSize = 'base',
  color,
  children,
  className,
}) => {
  return (
    <p
      className={clsx(fontSizeMap[fontSize], `text-${alignment}`, 'leading-relaxed', className)}
      style={{ color }}
    >
      {children ?? text}
    </p>
  );
};
