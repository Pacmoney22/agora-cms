import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ComponentInstance, ComponentTree } from '@agora-cms/shared';
import {
  findNode,
  insertNode,
  moveNode,
  removeNode,
  updateNodeProps,
  duplicateNode,
} from '@/lib/tree-operations';

export type ResponsiveMode = 'desktop' | 'tablet' | 'mobile';

interface BuilderState {
  componentTree: ComponentTree;
  selectedInstanceId: string | null;
  interactingInstanceId: string | null;
  clipboard: ComponentInstance | null;
  responsiveMode: ResponsiveMode;
  isDirty: boolean;
  isPreviewMode: boolean;
  // Page metadata
  currentPageId: string | null;
  pageTitle: string;
  pageSlug: string;
  pageStatus: 'draft' | 'review' | 'published' | 'archived';
}

interface BuilderActions {
  setComponentTree: (tree: ComponentTree) => void;
  selectComponent: (instanceId: string | null) => void;
  setInteracting: (instanceId: string | null) => void;
  insertComponent: (parentId: string, component: ComponentInstance, index?: number) => void;
  moveComponent: (instanceId: string, newParentId: string, newIndex: number) => void;
  removeComponent: (instanceId: string) => void;
  updateComponentProps: (instanceId: string, props: Record<string, unknown>) => void;
  duplicateComponent: (instanceId: string) => void;
  copyComponent: (instanceId: string) => void;
  pasteComponent: (parentId: string, index?: number) => void;
  setResponsiveMode: (mode: ResponsiveMode) => void;
  setPreviewMode: (enabled: boolean) => void;
  setPageMeta: (meta: { id?: string | null; title?: string; slug?: string; status?: BuilderState['pageStatus'] }) => void;
}

const initialTree: ComponentTree = {
  root: {
    instanceId: 'root',
    componentId: 'page-root',
    props: {},
    children: [],
  },
};

export const useBuilderStore = create<BuilderState & BuilderActions>()(
  immer((set, get) => ({
    // State
    componentTree: initialTree,
    selectedInstanceId: null,
    interactingInstanceId: null,
    clipboard: null,
    responsiveMode: 'desktop',
    isDirty: false,
    isPreviewMode: false,
    currentPageId: null,
    pageTitle: '',
    pageSlug: '',
    pageStatus: 'draft',

    // Actions
    setComponentTree: (tree) =>
      set((state) => {
        state.componentTree = tree;
        state.isDirty = false;
      }),

    selectComponent: (instanceId) =>
      set((state) => {
        state.selectedInstanceId = instanceId;
        // Exit interact mode when selecting a different component
        if (state.interactingInstanceId !== instanceId) {
          state.interactingInstanceId = null;
        }
      }),

    setInteracting: (instanceId) =>
      set((state) => {
        state.interactingInstanceId = instanceId;
      }),

    insertComponent: (parentId, component, index) =>
      set((state) => {
        state.componentTree = insertNode(state.componentTree, parentId, component, index);
        state.isDirty = true;
      }),

    moveComponent: (instanceId, newParentId, newIndex) =>
      set((state) => {
        state.componentTree = moveNode(state.componentTree, instanceId, newParentId, newIndex);
        state.isDirty = true;
      }),

    removeComponent: (instanceId) =>
      set((state) => {
        state.componentTree = removeNode(state.componentTree, instanceId);
        if (state.selectedInstanceId === instanceId) {
          state.selectedInstanceId = null;
        }
        state.isDirty = true;
      }),

    updateComponentProps: (instanceId, props) =>
      set((state) => {
        state.componentTree = updateNodeProps(state.componentTree, instanceId, props);

        // Keep container children in sync for multi-zone components
        const node = findNode(state.componentTree.root, instanceId);
        if (node) {
          if (node.componentId === 'grid' && 'columns' in props) {
            syncContainerChildren(node, props.columns as number);
          } else if (node.componentId === 'columns') {
            syncContainerChildren(node, 2); // always 2 columns
          } else if (node.componentId === 'tabs' && 'tabs' in props) {
            syncContainerChildren(node, (props.tabs as unknown[]).length);
          } else if (node.componentId === 'accordion' && 'items' in props) {
            syncContainerChildren(node, (props.items as unknown[]).length);
          }
        }

        state.isDirty = true;
      }),

    duplicateComponent: (instanceId) =>
      set((state) => {
        state.componentTree = duplicateNode(state.componentTree, instanceId);
        state.isDirty = true;
      }),

    copyComponent: (instanceId) =>
      set((state) => {
        const node = findNode(state.componentTree.root, instanceId);
        if (node) {
          state.clipboard = JSON.parse(JSON.stringify(node));
        }
      }),

    pasteComponent: (parentId, index) =>
      set((state) => {
        const { clipboard } = get();
        if (clipboard) {
          const cloned = JSON.parse(JSON.stringify(clipboard)) as ComponentInstance;
          assignNewIds(cloned);
          state.componentTree = insertNode(state.componentTree, parentId, cloned, index);
          state.isDirty = true;
        }
      }),

    setPageMeta: (meta) =>
      set((state) => {
        if (meta.id !== undefined) state.currentPageId = meta.id;
        if (meta.title !== undefined) state.pageTitle = meta.title;
        if (meta.slug !== undefined) state.pageSlug = meta.slug;
        if (meta.status !== undefined) state.pageStatus = meta.status;
      }),

    setResponsiveMode: (mode) =>
      set((state) => {
        state.responsiveMode = mode;
      }),

    setPreviewMode: (enabled) =>
      set((state) => {
        state.isPreviewMode = enabled;
        if (enabled) {
          state.selectedInstanceId = null;
        }
      }),
  }))
);

/** Recursively assign new instanceIds to a component and its children */
function assignNewIds(node: ComponentInstance): void {
  node.instanceId = crypto.randomUUID();
  for (const child of node.children) {
    assignNewIds(child);
  }
}

/** Sync container children count for multi-zone components (tabs, accordion) */
function syncContainerChildren(node: ComponentInstance, expectedCount: number): void {
  while (node.children.length < expectedCount) {
    node.children.push({
      instanceId: crypto.randomUUID(),
      componentId: 'container',
      props: { maxWidth: 'full', padding: '16px' },
      children: [],
    });
  }
  if (node.children.length > expectedCount) {
    node.children.length = expectedCount;
  }
}
