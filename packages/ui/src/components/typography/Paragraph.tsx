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
  // If children are provided (e.g. when used programmatically), render them directly
  if (children) {
    return (
      <div
        className={clsx(fontSizeMap[fontSize], `text-${alignment}`, 'leading-relaxed', className)}
        style={{ color }}
      >
        {children}
      </div>
    );
  }

  // Check if text contains HTML tags (from rich text editor)
  const isHtml = text ? /<[a-z][\s\S]*>/i.test(text) : false;

  if (isHtml && text) {
    return (
      <div
        className={clsx(
          'prose prose-sm max-w-none',
          fontSizeMap[fontSize],
          `text-${alignment}`,
          'leading-relaxed',
          className,
        )}
        style={{ color }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  return (
    <p
      className={clsx(fontSizeMap[fontSize], `text-${alignment}`, 'leading-relaxed', className)}
      style={{ color }}
    >
      {text}
    </p>
  );
};
