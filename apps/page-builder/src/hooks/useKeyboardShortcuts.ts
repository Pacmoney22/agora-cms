'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/stores/builder-store';
import { useHistoryStore } from '@/stores/history-store';

export function useKeyboardShortcuts() {
  const {
    selectedInstanceId,
    removeComponent,
    duplicateComponent,
    copyComponent,
    pasteComponent,
  } = useBuilderStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((isCtrl && e.key === 'z' && e.shiftKey) || (isCtrl && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedInstanceId) {
        // Don't intercept if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          return;
        }
        e.preventDefault();
        removeComponent(selectedInstanceId);
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrl && e.key === 'd' && selectedInstanceId) {
        e.preventDefault();
        duplicateComponent(selectedInstanceId);
        return;
      }

      // Copy: Ctrl+C (only if no text selected)
      if (isCtrl && e.key === 'c' && selectedInstanceId && !window.getSelection()?.toString()) {
        e.preventDefault();
        copyComponent(selectedInstanceId);
        return;
      }

      // Paste: Ctrl+V
      if (isCtrl && e.key === 'v') {
        e.preventDefault();
        pasteComponent('root');
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        useBuilderStore.getState().selectComponent(null);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedInstanceId, removeComponent, duplicateComponent, copyComponent, pasteComponent, undo, redo, canUndo, canRedo]);
}
