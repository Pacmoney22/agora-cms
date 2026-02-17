import React from 'react';
import { clsx } from 'clsx';

export interface DividerProps {
  color?: string;
  thickness?: string;
  margin?: string;
  style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'gradient';
  shadow?: boolean;
  icon?: string;
  width?: 'full' | '3/4' | '1/2' | '1/4';
  className?: string;
}

const widthMap: Record<string, string> = {
  full: '100%',
  '3/4': '75%',
  '1/2': '50%',
  '1/4': '25%',
};

function buildLineStyle(
  thickness: string,
  style: string,
  color: string,
  shadow: boolean,
): React.CSSProperties {
  const borderStyle = style === 'gradient' ? 'solid' : style;
  const result: React.CSSProperties = {
    borderTop: `${thickness} ${borderStyle} ${color}`,
  };
  if (style === 'gradient') {
    result.borderImage = `linear-gradient(to right, transparent, ${color}, transparent) 1`;
  }
  if (shadow) {
    result.boxShadow = `0 2px 4px ${color}40`;
  }
  return result;
}

export const Divider: React.FC<DividerProps> = ({
  color = '#e5e7eb',
  thickness = '1px',
  margin = '24px 0',
  style = 'solid',
  shadow = false,
  icon,
  width = 'full',
  className,
}) => {
  const lineStyle = buildLineStyle(thickness, style, color, shadow);

  if (icon) {
    return (
      <div
        className={clsx('flex items-center', className)}
        style={{ margin }}
      >
        <hr className="flex-1 border-0" style={lineStyle} />
        <span className="mx-3 shrink-0 text-lg" style={{ color }}>
          {icon}
        </span>
        <hr className="flex-1 border-0" style={lineStyle} />
      </div>
    );
  }

  return (
    <hr
      className={clsx('mx-auto border-0', className)}
      style={{ width: widthMap[width] || '100%', margin, ...lineStyle }}
    />
  );
};
