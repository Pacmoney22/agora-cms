import React from 'react';
import { clsx } from 'clsx';

export interface ColumnsProps {
  ratio?: '50-50' | '33-67' | '67-33' | '25-75' | '75-25' | '40-60' | '60-40';
  gap?: 'none' | 'small' | 'medium' | 'large';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  reverseOnMobile?: boolean;
  stackBreakpoint?: 'tablet' | 'mobile' | 'never';
  children?: React.ReactNode;
  className?: string;
}

const ratioMap: Record<string, { left: string; right: string }> = {
  '50-50': { left: 'flex-1', right: 'flex-1' },
  '33-67': { left: 'w-1/3', right: 'w-2/3' },
  '67-33': { left: 'w-2/3', right: 'w-1/3' },
  '25-75': { left: 'w-1/4', right: 'w-3/4' },
  '75-25': { left: 'w-3/4', right: 'w-1/4' },
  '40-60': { left: 'w-2/5', right: 'w-3/5' },
  '60-40': { left: 'w-3/5', right: 'w-2/5' },
};

const gapMap = {
  none: 'gap-0',
  small: 'gap-4',
  medium: 'gap-8',
  large: 'gap-12',
};

const verticalAlignMap = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
};

const stackBreakpointMap = {
  tablet: 'flex-col md:flex-row',
  mobile: 'flex-col sm:flex-row',
  never: 'flex-row',
};

export const Columns: React.FC<ColumnsProps> = ({
  ratio = '50-50',
  gap = 'medium',
  verticalAlignment = 'top',
  reverseOnMobile = false,
  stackBreakpoint = 'tablet',
  children,
  className,
}) => {
  const childrenArray = React.Children.toArray(children);
  const leftChild = childrenArray[0];
  const rightChild = childrenArray[1];
  const ratioClasses = ratioMap[ratio]!;

  return (
    <div
      className={clsx(
        'flex w-full',
        stackBreakpointMap[stackBreakpoint],
        gapMap[gap],
        verticalAlignMap[verticalAlignment],
        reverseOnMobile && stackBreakpoint !== 'never' && 'flex-col-reverse md:flex-row',
        className,
      )}
    >
      <div
        className={clsx(
          stackBreakpoint !== 'never' ? 'w-full' : ratioClasses.left,
          stackBreakpoint === 'tablet' && `md:${ratioClasses.left}`,
          stackBreakpoint === 'mobile' && `sm:${ratioClasses.left}`,
        )}
      >
        {leftChild}
      </div>
      <div
        className={clsx(
          stackBreakpoint !== 'never' ? 'w-full' : ratioClasses.right,
          stackBreakpoint === 'tablet' && `md:${ratioClasses.right}`,
          stackBreakpoint === 'mobile' && `sm:${ratioClasses.right}`,
        )}
      >
        {rightChild}
      </div>
    </div>
  );
};
