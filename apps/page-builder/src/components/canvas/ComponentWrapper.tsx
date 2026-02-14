'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useBuilderStore } from '@/stores/builder-store';
import { getComponent } from '@/lib/component-registry';
import type { ComponentInstance } from '@nextgen-cms/shared';

interface ComponentWrapperProps {
  instance: ComponentInstance;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

export const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  instance,
  isSelected,
  onSelect,
  children,
}) => {
  const { removeComponent, duplicateComponent } = useBuilderStore();
  const registered = getComponent(instance.componentId);
  const label = registered?.schema.name || instance.componentId;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: instance.instanceId,
    data: { instanceId: instance.instanceId, componentId: instance.componentId },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'group relative transition-all',
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1'
          : 'hover:ring-1 hover:ring-blue-300 hover:ring-offset-1',
        isDragging && 'opacity-30',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Component label badge */}
      <div
        className={clsx(
          'absolute -top-5 left-1 z-10 flex items-center gap-1 rounded-t-md px-2 py-0.5 text-[10px] font-medium',
          isSelected
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100',
        )}
      >
        {/* Drag handle */}
        <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
          &#x2630;
        </span>
        <span>{label}</span>
        {isSelected && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateComponent(instance.instanceId);
              }}
              className="ml-1 hover:text-blue-200"
              title="Duplicate"
            >
              &#x2398;
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeComponent(instance.instanceId);
              }}
              className="hover:text-red-200"
              title="Delete"
            >
              &#x2715;
            </button>
          </>
        )}
      </div>

      {/* Actual component content */}
      <div className="pointer-events-none">
        {children}
      </div>
    </div>
  );
};
