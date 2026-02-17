'use client';

import React from 'react';
import { ProductField } from './ProductField';

interface ReviewSourceData {
  productId: string;
  productName?: string;
}

interface ReviewSourceFieldProps {
  value: ReviewSourceData | null;
  onChange: (value: ReviewSourceData | null) => void;
}

export const ReviewSourceField: React.FC<ReviewSourceFieldProps> = ({ value, onChange }) => {
  const sourceData = value && typeof value === 'object' ? value : null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-gray-400">Select a product to display reviews for</p>
      <ProductField
        value={sourceData?.productId ?? ''}
        onChange={(productId) => {
          if (productId) {
            onChange({ productId, productName: undefined });
          } else {
            onChange(null);
          }
        }}
        placeholder="Select product for reviews..."
      />
    </div>
  );
};
