'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
} from '@dnd-kit/core';
import { useBuilderStore } from '@/stores/builder-store';
import { DropZone } from './DropZone';
import { ComponentWrapper } from './ComponentWrapper';
import { getComponent } from '@/lib/component-registry';
import type { ComponentInstance } from '@nextgen-cms/shared';

export const CanvasRenderer: React.FC = () => {
  const { componentTree, selectedInstanceId, selectComponent, insertComponent, moveComponent } =
    useBuilderStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeDragData, setActiveDragData] = React.useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragData(null);

    if (!over) return;

    const overData = over.data.current;
    const activeData = active.data.current;

    if (!overData) return;

    // Dragging from palette (new component)
    if (activeData?.fromPalette) {
      const newInstance: ComponentInstance = {
        instanceId: crypto.randomUUID(),
        componentId: activeData.componentId,
        props: { ...activeData.defaultProps },
        children: [],
      };
      insertComponent(
        overData.parentId || 'root',
        newInstance,
        overData.index,
      );
      selectComponent(newInstance.instanceId);
      return;
    }

    // Dragging existing component (reorder/reparent)
    if (activeData?.instanceId && overData.parentId) {
      moveComponent(
        activeData.instanceId,
        overData.parentId,
        overData.index ?? 0,
      );
    }
  };

  const renderChildren = (children: ComponentInstance[], parentId: string) => {
    return (
      <>
        {children.length === 0 && (
          <DropZone parentId={parentId} index={0} isEmpty />
        )}
        {children.map((child, index) => (
          <React.Fragment key={child.instanceId}>
            <DropZone parentId={parentId} index={index} />
            <ComponentWrapper
              instance={child}
              isSelected={selectedInstanceId === child.instanceId}
              onSelect={() => selectComponent(child.instanceId)}
            >
              {renderComponentContent(child)}
            </ComponentWrapper>
          </React.Fragment>
        ))}
        {children.length > 0 && (
          <DropZone parentId={parentId} index={children.length} />
        )}
      </>
    );
  };

  const renderComponentContent = (instance: ComponentInstance) => {
    const registered = getComponent(instance.componentId);
    if (!registered) {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          Unknown component: {instance.componentId}
        </div>
      );
    }

    const { component: Component, schema } = registered;

    // If this component accepts children, render them inside
    if (schema.acceptsChildren) {
      return (
        <Component {...instance.props}>
          {renderChildren(instance.children, instance.instanceId)}
        </Component>
      );
    }

    return <Component {...instance.props} />;
  };

  // Overlay shown while dragging
  const renderDragOverlay = () => {
    if (!activeDragData) return null;

    if (activeDragData.fromPalette) {
      return (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 shadow-lg">
          {activeDragData.label}
        </div>
      );
    }

    return (
      <div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-lg opacity-80">
        Moving component...
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="mx-auto min-h-full max-w-4xl rounded-lg border border-gray-200 bg-white shadow-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) selectComponent(null);
        }}
      >
        {renderChildren(componentTree.root.children, 'root')}
        {componentTree.root.children.length === 0 && (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-gray-400">Drag components here to start building</p>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? renderDragOverlay() : null}
      </DragOverlay>
    </DndContext>
  );
};
