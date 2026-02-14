import React from 'react';
import { clsx } from 'clsx';

export interface GridProps {
  columns?: 2 | 3 | 4;
  gap?: string;
  children?: React.ReactNode;
  className?: string;
}

const columnMap = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export const Grid: React.FC<GridProps> = ({ columns = 3, gap = '24px', children, className }) => {
  return (
    <div className={clsx('grid', columnMap[columns], className)} style={{ gap }}>
      {children}
    </div>
  );
};
