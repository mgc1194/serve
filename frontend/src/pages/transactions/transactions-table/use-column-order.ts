// pages/transactions/transactions-table/use-column-order.ts — Column order
// state and all drag-and-drop / keyboard reorder interaction handlers.
// Pointer drag and keyboard reorder run in parallel.

import { useRef, useState } from 'react';

import { type ColumnKey, COLUMN_LABELS, DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';

const DRAG_THRESHOLD = 6; // px — pointer delta below this is treated as a click

function reorder(order: ColumnKey[], from: ColumnKey, to: ColumnKey): ColumnKey[] {
  const next = [...order];
  const fromIdx = next.indexOf(from);
  const toIdx = next.indexOf(to);
  next.splice(fromIdx, 1);
  next.splice(toIdx, 0, from);
  return next;
}

export interface UseColumnOrderReturn {
  columnOrder: ColumnKey[];
  dragOver: ColumnKey | null;
  heldKey: ColumnKey | null;
  announcement: string;
  // Pointer drag
  handleMouseDown: (e: React.MouseEvent) => void;
  handleDragStart: (key: ColumnKey) => void;
  handleDragOver: (e: React.DragEvent, key: ColumnKey) => void;
  handleDrop: (targetKey: ColumnKey) => void;
  handleDragEnd: () => void;
  // Click-to-sort (guards against firing after a drag)
  handleHeaderClick: (e: React.MouseEvent, key: ColumnKey, onApplySort: (key: ColumnKey) => void) => void;
  // Keyboard reorder (for the drag-handle button)
  handleHandleKeyDown: (e: React.KeyboardEvent, key: ColumnKey) => void;
}

export function useColumnOrder(): UseColumnOrderReturn {
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const [heldKey, setHeldKey] = useState<ColumnKey | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const dragKey = useRef<ColumnKey | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // ── Pointer drag ────────────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
  }

  function handleDragStart(key: ColumnKey) {
    didDrag.current = true;
    dragKey.current = key;
  }

  function handleDragOver(e: React.DragEvent, key: ColumnKey) {
    e.preventDefault();
    if (dragKey.current !== key) setDragOver(key);
  }

  function handleDrop(targetKey: ColumnKey) {
    const from = dragKey.current;
    if (!from || from === targetKey) { setDragOver(null); return; }
    setColumnOrder(prev => reorder(prev, from, targetKey));
    setDragOver(null);
    dragKey.current = null;
  }

  function handleDragEnd() {
    setDragOver(null);
    dragKey.current = null;
  }

  // ── Click-to-sort (guards against accidental sort after a drag) ─────────────

  function handleHeaderClick(
    e: React.MouseEvent,
    key: ColumnKey,
    onApplySort: (key: ColumnKey) => void,
  ) {
    if (didDrag.current) return;
    const down = mouseDownPos.current;
    if (down) {
      const dx = Math.abs(e.clientX - down.x);
      const dy = Math.abs(e.clientY - down.y);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) return;
    }
    onApplySort(key);
  }

  // ── Keyboard reorder (on the drag-handle IconButton) ────────────────────────

  function handleHandleKeyDown(e: React.KeyboardEvent, key: ColumnKey) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // don't also trigger the header's sort
      if (heldKey === null) {
        setHeldKey(key);
        setAnnouncement(
          `${COLUMN_LABELS[key]} column picked up. Use Left and Right arrow keys to move, Enter or Space to drop, Escape to cancel.`,
        );
      } else if (key === heldKey) {
        const pos = columnOrder.indexOf(heldKey) + 1;
        setAnnouncement(
          `${COLUMN_LABELS[heldKey]} column dropped at position ${pos} of ${columnOrder.length}.`,
        );
        setHeldKey(null);
      }
      // Pressing Enter/Space on a different handle while one is held does nothing.
      return;
    }

    if (e.key === 'Escape' && heldKey !== null) {
      e.preventDefault();
      setAnnouncement(`${COLUMN_LABELS[heldKey]} column reorder cancelled.`);
      setHeldKey(null);
      return;
    }

    if (heldKey !== null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();
      setColumnOrder(prev => {
        const idx = prev.indexOf(heldKey);
        const targetIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        next.splice(targetIdx, 0, heldKey);
        setAnnouncement(
          `${COLUMN_LABELS[heldKey]} moved to position ${targetIdx + 1} of ${prev.length}.`,
        );
        return next;
      });
    }
  }

  return {
    columnOrder,
    dragOver,
    heldKey,
    announcement,
    handleMouseDown,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleHeaderClick,
    handleHandleKeyDown,
  };
}
