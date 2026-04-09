import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

/**
 * Registers global keyboard shortcuts.
 * Keys format: "ctrl+1", "ctrl+shift+s", "ctrl+m", etc.
 * Ignores shortcuts when focus is in an input, textarea, or [contenteditable].
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      parts.push(e.key.toLowerCase());
      const combo = parts.join('+');

      const action = shortcuts[combo];
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
