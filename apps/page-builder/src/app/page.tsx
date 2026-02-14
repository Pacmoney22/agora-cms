'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useBuilderStore, type ResponsiveMode } from '@/stores/builder-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ComponentPalette } from '@/components/sidebar/ComponentPalette';
import { PropertiesPanel } from '@/components/sidebar/PropertiesPanel';
import { TreeNavigator } from '@/components/sidebar/TreeNavigator';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { ComponentWrapper } from '@/components/canvas/ComponentWrapper';
import { DropZone } from '@/components/canvas/DropZone';
import { getComponent } from '@/lib/component-registry';
import type { ComponentInstance } from '@agora-cms/shared';

const RESPONSIVE_WIDTHS: Record<ResponsiveMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export default function PageBuilderPage() {
  const {
    componentTree,
    selectedInstanceId,
    selectComponent,
    insertComponent,
    moveComponent,
    responsiveMode,
    isDirty,
  } = useBuilderStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [leftTab, setLeftTab] = useState<'components' | 'tree'>('components');
  const [isSaving, setIsSaving] = useState(false);

  useKeyboardShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveDragData(null);

      if (!over) return;

      const overData = over.data.current;
      const activeData = active.data.current;
      if (!overData) return;

      // From palette
      if (activeData?.fromPalette) {
        const newInstance: ComponentInstance = {
          instanceId: crypto.randomUUID(),
          componentId: activeData.componentId,
          props: { ...activeData.defaultProps },
          children: [],
        };
        insertComponent(overData.parentId || 'root', newInstance, overData.index);
        selectComponent(newInstance.instanceId);
        return;
      }

      // Reorder existing
      if (activeData?.instanceId && overData.parentId) {
        moveComponent(activeData.instanceId, overData.parentId, overData.index ?? 0);
      }
    },
    [insertComponent, moveComponent, selectComponent],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    // TODO: POST to content-service API
    await new Promise((r) => setTimeout(r, 500));
    useBuilderStore.setState({ isDirty: false });
    setIsSaving(false);
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) handleSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, handleSave]);

  const renderChildren = (children: ComponentInstance[], parentId: string): React.ReactNode => {
    return (
      <>
        {children.length === 0 && <DropZone parentId={parentId} index={0} isEmpty />}
        {children.map((child, index) => (
          <React.Fragment key={child.instanceId}>
            <DropZone parentId={parentId} index={index} />
            <ComponentWrapper
              instance={child}
              isSelected={selectedInstanceId === child.instanceId}
              onSelect={() => selectComponent(child.instanceId)}
            >
              {renderComponent(child)}
            </ComponentWrapper>
          </React.Fragment>
        ))}
        {children.length > 0 && <DropZone parentId={parentId} index={children.length} />}
      </>
    );
  };

  const renderComponent = (instance: ComponentInstance): React.ReactNode => {
    const registered = getComponent(instance.componentId);
    if (!registered) {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          Unknown: {instance.componentId}
        </div>
      );
    }

    const { component: Component, schema } = registered;

    if (schema.acceptsChildren) {
      return (
        <Component {...instance.props}>
          {renderChildren(instance.children, instance.instanceId)}
        </Component>
      );
    }

    return <Component {...instance.props} />;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col">
        <Toolbar
          onSave={handleSave}
          onPreview={() => {/* TODO: preview mode */}}
          onPublish={() => {/* TODO: publish */}}
          isSaving={isSaving}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setLeftTab('components')}
                className={clsx(
                  'flex-1 py-2 text-xs font-medium transition-colors',
                  leftTab === 'components'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                Components
              </button>
              <button
                onClick={() => setLeftTab('tree')}
                className={clsx(
                  'flex-1 py-2 text-xs font-medium transition-colors',
                  leftTab === 'tree'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                Layer Tree
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {leftTab === 'components' ? <ComponentPalette /> : <TreeNavigator />}
            </div>
          </aside>

          {/* Canvas */}
          <main
            className="flex-1 overflow-y-auto bg-gray-100 p-8"
            onClick={() => selectComponent(null)}
          >
            <div
              className="mx-auto transition-all duration-200"
              style={{ maxWidth: RESPONSIVE_WIDTHS[responsiveMode] }}
            >
              <div className="min-h-[600px] rounded-lg border border-gray-200 bg-white shadow-sm">
                {renderChildren(componentTree.root.children, 'root')}
                {componentTree.root.children.length === 0 && (
                  <div className="flex min-h-[400px] items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg text-gray-300">Empty Page</p>
                      <p className="mt-1 text-sm text-gray-400">
                        Drag components from the left sidebar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - Properties */}
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Properties
            </h2>
            <PropertiesPanel />
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId && activeDragData ? (
          <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 shadow-lg">
            {activeDragData.fromPalette ? activeDragData.label : 'Moving...'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
