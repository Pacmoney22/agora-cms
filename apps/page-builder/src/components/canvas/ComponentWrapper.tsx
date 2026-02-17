'use client';

import React, { useCallback, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useBuilderStore } from '@/stores/builder-store';
import { getComponent } from '@/lib/component-registry';
import type { ComponentInstance } from '@agora-cms/shared';

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
  const { removeComponent, duplicateComponent, interactingInstanceId, setInteracting } =
    useBuilderStore();
  const registered = getComponent(instance.componentId);
  const label = registered?.schema.name || instance.componentId;

  const isInteracting = interactingInstanceId === instance.instanceId;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: instance.instanceId,
    data: { instanceId: instance.instanceId, componentId: instance.componentId },
    disabled: isInteracting,
  });

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSelected && !isInteracting) {
        setInteracting(instance.instanceId);
      }
    },
    [isSelected, isInteracting, setInteracting, instance.instanceId],
  );

  // ESC exits interact mode
  useEffect(() => {
    if (!isInteracting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInteracting(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isInteracting, setInteracting]);

  let ringClass = 'hover:ring-1 hover:ring-blue-300 hover:ring-offset-1';
  if (isInteracting) ringClass = 'ring-2 ring-amber-500 ring-offset-1';
  else if (isSelected) ringClass = 'ring-2 ring-blue-500 ring-offset-1';

  let badgeClass = 'bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100';
  if (isInteracting) badgeClass = 'bg-amber-500 text-white';
  else if (isSelected) badgeClass = 'bg-blue-500 text-white';

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'group relative transition-all',
        ringClass,
        isDragging && 'opacity-30',
      )}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (!isInteracting) {
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          if (isInteracting) return;
          if (isSelected) {
            setInteracting(instance.instanceId);
          } else {
            onSelect();
          }
        }
      }}
    >
      {/* Component label badge */}
      <div
        className={clsx(
          'absolute -top-5 left-1 z-10 flex items-center gap-1 rounded-t-md px-2 py-0.5 text-[10px] font-medium',
          badgeClass,
        )}
      >
        {/* Drag handle */}
        {!isInteracting && (
          <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
            &#x2630;
          </span>
        )}
        <span>{isInteracting ? `${label} (Interacting)` : label}</span>
        {isInteracting && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setInteracting(null);
            }}
            className="ml-1 hover:text-amber-200"
            title="Exit interact mode (Esc)"
          >
            &#x2715;
          </button>
        )}
        {isSelected && !isInteracting && (
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
      <div className={isInteracting ? undefined : 'pointer-events-none'}>
        {children}
      </div>
    </div>
  );
};
