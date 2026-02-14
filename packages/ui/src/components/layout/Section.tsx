import React from 'react';
import { clsx } from 'clsx';

export interface SectionProps {
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  paddingTop = '48px',
  paddingBottom = '48px',
  backgroundColor,
  children,
  className,
}) => {
  return (
    <section
      className={clsx('w-full', className)}
      style={{ paddingTop, paddingBottom, backgroundColor }}
    >
      {children}
    </section>
  );
};
