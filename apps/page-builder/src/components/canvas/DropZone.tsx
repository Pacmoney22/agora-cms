'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';

interface DropZoneProps {
  parentId: string;
  index: number;
  isEmpty?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ parentId, index, isEmpty }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `dropzone-${parentId}-${index}`,
    data: { parentId, index },
  });

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={clsx(
          'flex min-h-[60px] items-center justify-center rounded-md border-2 border-dashed transition-colors',
          isOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-gray-50/50',
        )}
      >
        <span className="text-xs text-gray-400">
          {isOver ? 'Drop here' : 'Drop components here'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'transition-all',
        isOver ? 'h-2 bg-blue-400 rounded-full my-1' : 'h-0.5',
      )}
    />
  );
};
