'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { resolveSharedProps, hasActiveSharedProps } from '@/lib/shared-props-styles';
import { apiFetch } from '@/lib/api';
import { useTemplates } from '@/hooks/useTemplates';
import type { ComponentInstance, ComponentTree } from '@agora-cms/shared';

const RESPONSIVE_WIDTHS: Record<ResponsiveMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

function PageBuilderContent() {
  const {
    componentTree,
    selectedInstanceId,
    selectComponent,
    insertComponent,
    moveComponent,
    responsiveMode,
    isDirty,
    isPreviewMode,
    setPreviewMode,
    setInteracting,
    setComponentTree,
    currentPageId,
    pageTitle,
    pageSlug,
    pageStatus,
    setPageMeta,
  } = useBuilderStore();

  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [leftTab, setLeftTab] = useState<'components' | 'tree'>('components');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogTitle, setSaveDialogTitle] = useState('');
  const [saveDialogSlug, setSaveDialogSlug] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(288); // 18rem = w-72
  const isResizingRef = useRef(false);
  const publishAfterSaveRef = useRef(false);
  const pageLoadedRef = useRef(false);

  // Template state
  const { templates, loading: templatesLoading, fetchTemplates, saveAsTemplate, instantiateTemplate } = useTemplates();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => setMounted(true), []);

  useKeyboardShortcuts();

  // Load existing page when ?page=<id> is present in the URL
  useEffect(() => {
    const pageId = searchParams.get('page');
    if (!pageId || pageLoadedRef.current) return;

    pageLoadedRef.current = true;
    setIsLoadingPage(true);

    apiFetch<{
      id: string;
      title: string;
      slug: string;
      status: string;
      componentTree: ComponentTree;
    }>(`/api/v1/pages/${encodeURIComponent(pageId)}`)
      .then((page) => {
        // Load the component tree — use it if it has a root, otherwise keep default
        if (page.componentTree && typeof page.componentTree === 'object' && 'root' in page.componentTree) {
          setComponentTree(page.componentTree);
        }
        setPageMeta({
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status as 'draft' | 'review' | 'published' | 'archived',
        });
      })
      .catch((err) => {
        setSaveError(`Failed to load page: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => {
        setIsLoadingPage(false);
      });
  }, [searchParams, setComponentTree, setPageMeta]);

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
        // Auto-create child containers for multi-zone layout components
        const children: ComponentInstance[] = [];
        if (activeData.componentId === 'grid') {
          const cols = activeData.defaultProps?.columns ?? 3;
          for (let i = 0; i < cols; i++) {
            children.push({
              instanceId: crypto.randomUUID(),
              componentId: 'container',
              props: { maxWidth: 'full', padding: '16px' },
              children: [],
            });
          }
        } else if (activeData.componentId === 'columns') {
          for (let i = 0; i < 2; i++) {
            children.push({
              instanceId: crypto.randomUUID(),
              componentId: 'container',
              props: { maxWidth: 'full', padding: '16px' },
              children: [],
            });
          }
        } else if (activeData.componentId === 'tabs') {
          const tabCount = activeData.defaultProps?.tabs?.length ?? 3;
          for (let i = 0; i < tabCount; i++) {
            children.push({
              instanceId: crypto.randomUUID(),
              componentId: 'container',
              props: { maxWidth: 'full', padding: '16px' },
              children: [],
            });
          }
        } else if (activeData.componentId === 'accordion') {
          const itemCount = activeData.defaultProps?.items?.length ?? 3;
          for (let i = 0; i < itemCount; i++) {
            children.push({
              instanceId: crypto.randomUUID(),
              componentId: 'container',
              props: { maxWidth: 'full', padding: '16px' },
              children: [],
            });
          }
        }

        const newInstance: ComponentInstance = {
          instanceId: crypto.randomUUID(),
          componentId: activeData.componentId,
          props: { ...activeData.defaultProps },
          children,
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

  /** Generate a URL-friendly slug part from a title (no leading /). */
  const toSlug = (title: string) =>
    title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/(^-|-$)/g, '');

  /** Ensure a slug always starts with exactly one /. */
  const normalizeSlug = (slug: string) =>
    '/' + slug.replaceAll(/^\/+/g, '');

  /**
   * Save the page to the backend.
   * If no currentPageId exists yet, opens the save dialog to get title/slug first.
   */
  const handleSave = useCallback(async () => {
    const { currentPageId: pid, pageTitle: title, pageSlug: slug } = useBuilderStore.getState();

    // First save — need a title
    if (!pid && !title) {
      setShowSaveDialog(true);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const tree = useBuilderStore.getState().componentTree;
      if (pid) {
        // Update existing page
        await apiFetch(`/api/v1/pages/${encodeURIComponent(pid)}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title || 'Untitled Page',
            slug: normalizeSlug(slug || toSlug(title || 'untitled')),
            componentTree: tree,
          }),
        });
      } else {
        // Create new page
        const res = await apiFetch<{ id: string; slug: string; status: string }>('/api/v1/pages', {
          method: 'POST',
          body: JSON.stringify({
            title: title || 'Untitled Page',
            slug: normalizeSlug(slug || toSlug(title || 'untitled')),
            componentTree: tree,
          }),
        });
        setPageMeta({ id: res.id, slug: res.slug, status: res.status as 'draft' });
      }
      useBuilderStore.setState({ isDirty: false });

      // If publish was pending, fire it now
      if (publishAfterSaveRef.current) {
        publishAfterSaveRef.current = false;
        await doPublish();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [setPageMeta]);

  /** Confirm save from the dialog (first-time save). */
  const handleSaveDialogConfirm = useCallback(async () => {
    if (!saveDialogTitle.trim()) return;
    const slug = normalizeSlug(saveDialogSlug.trim() || toSlug(saveDialogTitle));
    setPageMeta({ title: saveDialogTitle.trim(), slug });
    setShowSaveDialog(false);
    // Now run the actual save
    setTimeout(() => handleSave(), 0);
  }, [saveDialogTitle, saveDialogSlug, setPageMeta, handleSave]);

  /** Call the publish API endpoint. */
  const doPublish = useCallback(async () => {
    const pid = useBuilderStore.getState().currentPageId;
    if (!pid) return;
    setIsPublishing(true);
    try {
      await apiFetch(`/api/v1/pages/${encodeURIComponent(pid)}/publish`, {
        method: 'POST',
      });
      setPageMeta({ status: 'published' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }, [setPageMeta]);

  /** Publish handler: save first if dirty or if page doesn't exist yet, then publish. */
  const handlePublish = useCallback(async () => {
    const { currentPageId: pid, isDirty: dirty, pageTitle: title } = useBuilderStore.getState();
    if (!pid && !title) {
      // Need to create the page first
      publishAfterSaveRef.current = true;
      setShowSaveDialog(true);
      return;
    }
    if (!pid || dirty) {
      // Save first, then publish
      publishAfterSaveRef.current = true;
      await handleSave();
      return;
    }
    // Already saved and clean — just publish
    await doPublish();
  }, [handleSave, doPublish]);

  const handleTogglePreview = useCallback(() => {
    setPreviewMode(!isPreviewMode);
  }, [isPreviewMode, setPreviewMode]);

  /** Open the "Save as Template" dialog. */
  const handleSaveAsTemplate = useCallback(() => {
    const pid = useBuilderStore.getState().currentPageId;
    if (!pid) {
      setSaveError('Please save the page first before creating a template.');
      return;
    }
    setTemplateName(useBuilderStore.getState().pageTitle || '');
    setShowTemplateDialog(true);
  }, []);

  /** Confirm the "Save as Template" dialog. */
  const handleTemplateDialogConfirm = useCallback(async () => {
    const pid = useBuilderStore.getState().currentPageId;
    if (!pid || !templateName.trim()) return;
    setIsSavingTemplate(true);
    try {
      await saveAsTemplate(pid, templateName.trim());
      setShowTemplateDialog(false);
      setTemplateName('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  }, [templateName, saveAsTemplate]);

  /** Load templates and show picker (for new pages). */
  const handleShowTemplatePicker = useCallback(() => {
    fetchTemplates();
    setShowTemplatePicker(true);
  }, [fetchTemplates]);

  /** Start a new page from a template. */
  const handleUseTemplate = useCallback(async (templateId: string) => {
    setShowTemplatePicker(false);
    setIsLoadingPage(true);
    try {
      const title = saveDialogTitle.trim() || 'Untitled Page';
      const slug = normalizeSlug(saveDialogSlug.trim() || toSlug(title));
      const res = await instantiateTemplate(templateId, slug, title);
      // Load the new page into the builder
      const page = await apiFetch<{
        id: string;
        title: string;
        slug: string;
        status: string;
        componentTree: ComponentTree;
      }>(`/api/v1/pages/${encodeURIComponent(res.id)}`);
      if (page.componentTree && typeof page.componentTree === 'object' && 'root' in page.componentTree) {
        setComponentTree(page.componentTree);
      }
      setPageMeta({
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status as 'draft',
      });
      setShowSaveDialog(false);
      useBuilderStore.setState({ isDirty: false });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create page from template');
    } finally {
      setIsLoadingPage(false);
    }
  }, [saveDialogTitle, saveDialogSlug, instantiateTemplate, setComponentTree, setPageMeta]);

  // Right panel resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startW = rightPanelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      // Dragging left increases width
      const newW = Math.min(600, Math.max(240, startW + (startX - ev.clientX)));
      setRightPanelWidth(newW);
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) handleSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty, handleSave]);

  // --- Editor mode: with builder chrome (drop zones, selection, drag handles) ---

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
    const useWrapper = hasActiveSharedProps(instance.props);
    const shared = useWrapper ? resolveSharedProps(instance.props) : null;

    let content: React.ReactNode;

    // Helper: render a zone child (container) without interleaved DropZones.
    // The container itself has acceptsChildren, so renderComponent gives it
    // its own internal drop zones for adding content inside.
    const renderZoneChild = (child: ComponentInstance) => (
      <ComponentWrapper
        key={child.instanceId}
        instance={child}
        isSelected={selectedInstanceId === child.instanceId}
        onSelect={() => selectComponent(child.instanceId)}
      >
        {renderComponent(child)}
      </ComponentWrapper>
    );

    // --- Multi-zone editor layouts ---
    // These components have a fixed set of child containers (one per zone).
    // In the editor we render custom layouts so every zone is visible and
    // droppable without the interleaved DropZones breaking their CSS layout.

    if (instance.componentId === 'grid') {
      const cols = (instance.props.columns as number) ?? 3;
      const gap = (instance.props.gap as string) ?? '24px';
      content = (
        <div className="rounded border border-dashed border-emerald-300 bg-emerald-50/30">
          <div className="flex items-center gap-1 border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
            <span>&#x2630;</span> Grid ({cols} columns)
          </div>
          <div className="grid p-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
            {instance.children.map((child, i) => (
              <div key={child.instanceId} className="min-h-[80px] rounded border border-dashed border-emerald-200 bg-white">
                <div className="bg-emerald-50/50 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                  Col {i + 1}
                </div>
                {renderZoneChild(child)}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (instance.componentId === 'columns') {
      const ratio = (instance.props.ratio as string) ?? '50-50';
      const [left, right] = ratio.split('-').map(Number);
      const total = (left ?? 50) + (right ?? 50);
      const leftPct = `${((left ?? 50) / total) * 100}%`;
      const rightPct = `${((right ?? 50) / total) * 100}%`;
      content = (
        <div className="rounded border border-dashed border-sky-300 bg-sky-50/30">
          <div className="flex items-center gap-1 border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600">
            <span>&#x2630;</span> Columns ({ratio})
          </div>
          <div className="flex gap-2 p-2">
            {instance.children.slice(0, 2).map((child, i) => (
              <div
                key={child.instanceId}
                className="min-h-[80px] rounded border border-dashed border-sky-200 bg-white"
                style={{ width: i === 0 ? leftPct : rightPct }}
              >
                <div className="bg-sky-50/50 px-2 py-0.5 text-[10px] font-medium text-sky-500">
                  {i === 0 ? 'Left' : 'Right'}
                </div>
                {renderZoneChild(child)}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (instance.componentId === 'tabs') {
      const tabItems = (instance.props.tabs as Array<{ label?: string }>) ?? [];
      content = (
        <div className="rounded border border-dashed border-indigo-300 bg-indigo-50/30">
          <div className="flex items-center gap-1 border-b border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
            <span>&#x2630;</span> Tabs
          </div>
          {instance.children.map((child, i) => (
            <div key={child.instanceId} className="border-t border-dashed border-indigo-200">
              <div className="bg-indigo-50/50 px-3 py-1 text-[11px] font-medium text-indigo-500">
                {tabItems[i]?.label || `Tab ${i + 1}`}
              </div>
              <div className="min-h-[48px]">
                {renderZoneChild(child)}
              </div>
            </div>
          ))}
          {instance.children.length === 0 && (
            <div className="p-4 text-center text-xs text-indigo-300">No tabs defined</div>
          )}
        </div>
      );
    } else if (instance.componentId === 'accordion') {
      const accItems = (instance.props.items as Array<{ title?: string }>) ?? [];
      content = (
        <div className="rounded border border-dashed border-amber-300 bg-amber-50/30">
          <div className="flex items-center gap-1 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <span>&#x25BC;</span> Accordion
          </div>
          {instance.children.map((child, i) => (
            <div key={child.instanceId} className="border-t border-dashed border-amber-200">
              <div className="bg-amber-50/50 px-3 py-1 text-[11px] font-medium text-amber-600">
                {accItems[i]?.title || `Item ${i + 1}`}
              </div>
              <div className="min-h-[48px]">
                {renderZoneChild(child)}
              </div>
            </div>
          ))}
          {instance.children.length === 0 && (
            <div className="p-4 text-center text-xs text-amber-300">No items defined</div>
          )}
        </div>
      );
    } else if (schema.acceptsChildren) {
      content = (
        <Component {...instance.props}>
          {renderChildren(instance.children, instance.instanceId)}
        </Component>
      );
    } else {
      content = <Component {...instance.props} />;
    }

    if (shared) {
      return (
        <div style={shared.style} className={shared.className || undefined} id={shared.id}>
          {content}
        </div>
      );
    }
    return content;
  };

  // --- Preview mode: clean render without builder chrome ---

  const renderPreviewChildren = (children: ComponentInstance[]): React.ReactNode => {
    return children.map((child) => (
      <React.Fragment key={child.instanceId}>
        {renderPreviewComponent(child)}
      </React.Fragment>
    ));
  };

  const renderPreviewComponent = (instance: ComponentInstance): React.ReactNode => {
    const registered = getComponent(instance.componentId);
    if (!registered) return null;

    const { component: Component, schema } = registered;
    const useWrapper = hasActiveSharedProps(instance.props);
    const shared = useWrapper ? resolveSharedProps(instance.props) : null;

    let content: React.ReactNode;
    if (schema.acceptsChildren) {
      content = (
        <Component {...instance.props}>
          {renderPreviewChildren(instance.children)}
        </Component>
      );
    } else {
      content = <Component {...instance.props} />;
    }

    if (shared) {
      return (
        <div style={shared.style} className={shared.className || undefined} id={shared.id}>
          {content}
        </div>
      );
    }
    return content;
  };

  // Prevent SSR of DndContext to avoid hydration mismatches from
  // @dnd-kit's internally generated aria-* attributes and live regions.
  if (!mounted || isLoadingPage) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex h-12 items-center justify-center border-b border-gray-200 bg-white">
          <span className="text-sm text-gray-400">
            {isLoadingPage ? 'Loading page...' : 'Loading Page Builder...'}
          </span>
        </div>
        <div className="flex-1 bg-gray-100" />
      </div>
    );
  }

  // --- Preview mode layout ---
  if (isPreviewMode) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar
          onSave={handleSave}
          onPreview={handleTogglePreview}
          onPublish={handlePublish}
          onSaveAsTemplate={handleSaveAsTemplate}
          isSaving={isSaving}
          isPublishing={isPublishing}
          pageStatus={pageStatus}
          pageTitle={pageTitle}
        />

        <main className="flex-1 overflow-y-auto bg-gray-100 p-8">
          <div
            className="mx-auto transition-all duration-200"
            style={{ maxWidth: RESPONSIVE_WIDTHS[responsiveMode] }}
          >
            <div className="min-h-[600px] rounded-lg border border-gray-200 bg-white shadow-sm">
              {renderPreviewChildren(componentTree.root.children)}
              {componentTree.root.children.length === 0 && (
                <div className="flex min-h-[400px] items-center justify-center">
                  <p className="text-lg text-gray-300">Empty Page</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Editor mode layout ---
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
          onPreview={handleTogglePreview}
          onPublish={handlePublish}
          onSaveAsTemplate={handleSaveAsTemplate}
          isSaving={isSaving}
          isPublishing={isPublishing}
          pageStatus={pageStatus}
          pageTitle={pageTitle}
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
            onClick={() => { selectComponent(null); setInteracting(null); }}
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

          {/* Right Sidebar - Properties (resizable) */}
          <div
            onMouseDown={handleResizeStart}
            className="w-1 shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400 active:bg-blue-500"
            title="Drag to resize"
          />
          <aside
            className="shrink-0 overflow-y-auto bg-white p-4"
            style={{ width: rightPanelWidth }}
          >
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

      {/* Save Dialog — shown on first save when no page title exists */}
      {showSaveDialog && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowSaveDialog(false)} />
          <div className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Save Page</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Page Title</label>
                <input
                  type="text"
                  value={saveDialogTitle}
                  onChange={(e) => {
                    setSaveDialogTitle(e.target.value);
                    if (!saveDialogSlug || saveDialogSlug === toSlug(saveDialogTitle)) {
                      setSaveDialogSlug(toSlug(e.target.value));
                    }
                  }}
                  placeholder="My New Page"
                  autoFocus
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">URL Slug</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-400">/</span>
                  <input
                    type="text"
                    value={saveDialogSlug}
                    onChange={(e) => setSaveDialogSlug(e.target.value)}
                    placeholder="my-new-page"
                    className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleShowTemplatePicker}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                Start from Template...
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDialogConfirm}
                  disabled={!saveDialogTitle.trim()}
                  className={clsx(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    saveDialogTitle.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-300 text-blue-100 cursor-not-allowed',
                  )}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Template Picker Dialog */}
      {showTemplatePicker && (
        <>
          <div className="fixed inset-0 z-[62] bg-black/40" onClick={() => setShowTemplatePicker(false)} />
          <div className="fixed left-1/2 top-1/2 z-[63] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Choose a Template</h2>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                <span className="ml-2 text-sm text-gray-500">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No templates available yet.</p>
                <p className="mt-1 text-xs text-gray-400">Save a page as a template to use it here.</p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleUseTemplate(tpl.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-50"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <span className="text-lg">&#x1F4C4;</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{tpl.name}</p>
                      {tpl.description && (
                        <p className="truncate text-xs text-gray-500">{tpl.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Save as Template Dialog */}
      {showTemplateDialog && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowTemplateDialog(false)} />
          <div className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Save as Template</h2>
            <p className="mb-3 text-sm text-gray-500">
              Create a reusable template from this page. The template will include all components and their configuration.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Landing Page, Product Page"
                autoFocus
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowTemplateDialog(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTemplateDialogConfirm}
                disabled={!templateName.trim() || isSavingTemplate}
                className={clsx(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  templateName.trim() && !isSavingTemplate
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-300 text-purple-100 cursor-not-allowed',
                )}
              >
                {isSavingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Error toast */}
      {saveError && (
        <div className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
          <span className="text-sm text-red-700">{saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="text-red-400 hover:text-red-600"
          >
            &#x2715;
          </button>
        </div>
      )}
    </DndContext>
  );
}

export default function PageBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col">
          <div className="flex h-12 items-center justify-center border-b border-gray-200 bg-white">
            <span className="text-sm text-gray-400">Loading Page Builder...</span>
          </div>
          <div className="flex-1 bg-gray-100" />
        </div>
      }
    >
      <PageBuilderContent />
    </Suspense>
  );
}
