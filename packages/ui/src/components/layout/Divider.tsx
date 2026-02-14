import React from 'react';
import { clsx } from 'clsx';

export interface DividerProps {
  color?: string;
  thickness?: string;
  margin?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  color = '#e5e7eb',
  thickness = '1px',
  margin = '24px 0',
  className,
}) => {
  return (
    <hr
      className={clsx('w-full border-0', className)}
      style={{ borderTop: `${thickness} solid ${color}`, margin }}
    />
  );
};
