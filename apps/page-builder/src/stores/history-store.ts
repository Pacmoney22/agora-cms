import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produceWithPatches, enablePatches, type Patch } from 'immer';

enablePatches();

const MAX_UNDO_STACK = 100;

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  description?: string;
}

interface HistoryState {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

interface HistoryActions {
  pushState: (patches: Patch[], inversePatches: Patch[], description?: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState & HistoryActions>()(
  immer((set, get) => ({
    // State
    undoStack: [],
    redoStack: [],

    // Actions
    pushState: (patches, inversePatches, description) =>
      set((state) => {
        state.undoStack.push({ patches, inversePatches, description });
        if (state.undoStack.length > MAX_UNDO_STACK) {
          state.undoStack.shift();
        }
        // Clear redo stack when new changes are made
        state.redoStack = [];
      }),

    undo: () => {
      const { undoStack } = get();
      if (undoStack.length === 0) return null;

      let entry: HistoryEntry | null = null;

      set((state) => {
        entry = state.undoStack.pop() ?? null;
        if (entry) {
          state.redoStack.push(entry);
        }
      });

      return entry;
    },

    redo: () => {
      const { redoStack } = get();
      if (redoStack.length === 0) return null;

      let entry: HistoryEntry | null = null;

      set((state) => {
        entry = state.redoStack.pop() ?? null;
        if (entry) {
          state.undoStack.push(entry);
        }
      });

      return entry;
    },

    canUndo: () => get().undoStack.length > 0,

    canRedo: () => get().redoStack.length > 0,

    clear: () =>
      set((state) => {
        state.undoStack = [];
        state.redoStack = [];
      }),
  }))
);

export { produceWithPatches };
