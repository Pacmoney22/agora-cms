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
  clipboard: ComponentInstance | null;
  responsiveMode: ResponsiveMode;
  isDirty: boolean;
}

interface BuilderActions {
  setComponentTree: (tree: ComponentTree) => void;
  selectComponent: (instanceId: string | null) => void;
  insertComponent: (parentId: string, component: ComponentInstance, index?: number) => void;
  moveComponent: (instanceId: string, newParentId: string, newIndex: number) => void;
  removeComponent: (instanceId: string) => void;
  updateComponentProps: (instanceId: string, props: Record<string, unknown>) => void;
  duplicateComponent: (instanceId: string) => void;
  copyComponent: (instanceId: string) => void;
  pasteComponent: (parentId: string, index?: number) => void;
  setResponsiveMode: (mode: ResponsiveMode) => void;
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
    clipboard: null,
    responsiveMode: 'desktop',
    isDirty: false,

    // Actions
    setComponentTree: (tree) =>
      set((state) => {
        state.componentTree = tree;
        state.isDirty = false;
      }),

    selectComponent: (instanceId) =>
      set((state) => {
        state.selectedInstanceId = instanceId;
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

    setResponsiveMode: (mode) =>
      set((state) => {
        state.responsiveMode = mode;
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
