import React from 'react';

export interface SpacerProps {
  height?: string;
}

export const Spacer: React.FC<SpacerProps> = ({ height = '32px' }) => {
  return <div style={{ height }} aria-hidden="true" />;
};
