// pages/transactions/transactions-table/use-column-order.test.ts

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';

import { useColumnOrder } from './use-column-order';

// ── useColumnOrder ────────────────────────────────────────────────────────────

describe('useColumnOrder initial state', () => {
  it('starts with the default column order', () => {
    const { result } = renderHook(() => useColumnOrder());
    expect(result.current.columnOrder).toEqual(DEFAULT_COLUMN_ORDER);
  });

  it('starts with no dragOver', () => {
    const { result } = renderHook(() => useColumnOrder());
    expect(result.current.dragOver).toBeNull();
  });

  it('starts with no heldKey', () => {
    const { result } = renderHook(() => useColumnOrder());
    expect(result.current.heldKey).toBeNull();
  });

  it('starts with an empty announcement', () => {
    const { result } = renderHook(() => useColumnOrder());
    expect(result.current.announcement).toBe('');
  });
});

// ── Pointer drag ──────────────────────────────────────────────────────────────

describe('useColumnOrder pointer drag', () => {
  it('reorders columns on drop', () => {
    const { result } = renderHook(() => useColumnOrder());
    const [first, second] = result.current.columnOrder;

    act(() => result.current.handleDragStart(first));
    act(() => result.current.handleDrop(second));

    expect(result.current.columnOrder[0]).toBe(second);
    expect(result.current.columnOrder[1]).toBe(first);
  });

  it('clears dragOver after drop', () => {
    const { result } = renderHook(() => useColumnOrder());
    const [first, second] = result.current.columnOrder;

    act(() => {
      result.current.handleDragStart(first);
      result.current.handleDrop(second);
    });

    expect(result.current.dragOver).toBeNull();
  });

  it('does not reorder when dropping on the same column', () => {
    const { result } = renderHook(() => useColumnOrder());
    const original = [...result.current.columnOrder];
    const [first] = result.current.columnOrder;

    act(() => {
      result.current.handleDragStart(first);
      result.current.handleDrop(first);
    });

    expect(result.current.columnOrder).toEqual(original);
  });

  it('clears dragOver on dragEnd', () => {
    const { result } = renderHook(() => useColumnOrder());
    act(() => result.current.handleDragEnd());
    expect(result.current.dragOver).toBeNull();
  });
});

// ── handleHeaderClick ─────────────────────────────────────────────────────────

describe('useColumnOrder handleHeaderClick', () => {
  it('calls onApplySort when no drag occurred', () => {
    const { result } = renderHook(() => useColumnOrder());
    const onApplySort = vi.fn();

    act(() => {
      result.current.handleMouseDown({ clientX: 10, clientY: 10 } as React.MouseEvent);
    });

    act(() => {
      result.current.handleHeaderClick(
        { clientX: 11, clientY: 11 } as React.MouseEvent,
        'concept',
        onApplySort,
      );
    });

    expect(onApplySort).toHaveBeenCalledWith('concept');
  });

  it('does not call onApplySort after a drag (didDrag flag set)', () => {
    const { result } = renderHook(() => useColumnOrder());
    const onApplySort = vi.fn();

    act(() => result.current.handleDragStart('concept'));
    act(() => {
      result.current.handleHeaderClick(
        { clientX: 0, clientY: 0 } as React.MouseEvent,
        'concept',
        onApplySort,
      );
    });

    expect(onApplySort).not.toHaveBeenCalled();
  });

  it('does not call onApplySort when pointer moved beyond the drag threshold', () => {
    const { result } = renderHook(() => useColumnOrder());
    const onApplySort = vi.fn();

    act(() => {
      result.current.handleMouseDown({ clientX: 0, clientY: 0 } as React.MouseEvent);
    });

    act(() => {
      result.current.handleHeaderClick(
        { clientX: 20, clientY: 0 } as React.MouseEvent,
        'concept',
        onApplySort,
      );
    });

    expect(onApplySort).not.toHaveBeenCalled();
  });
});

// ── Keyboard reorder ──────────────────────────────────────────────────────────

describe('useColumnOrder keyboard reorder', () => {
  function keyDown(key: string, extra: Partial<React.KeyboardEvent> = {}): React.KeyboardEvent {
    return { key, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra } as unknown as React.KeyboardEvent;
  }

  it('picks up a column on Enter', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));

    expect(result.current.heldKey).toBe(col);
  });

  it('picks up a column on Space', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown(' '), col));

    expect(result.current.heldKey).toBe(col);
  });

  it('announces pickup', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));

    expect(result.current.announcement).toMatch(/picked up/i);
  });

  it('moves the held column right on ArrowRight', () => {
    const { result } = renderHook(() => useColumnOrder());
    const [first, second] = result.current.columnOrder;

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), first));
    act(() => result.current.handleHandleKeyDown(keyDown('ArrowRight'), first));

    expect(result.current.columnOrder[0]).toBe(second);
    expect(result.current.columnOrder[1]).toBe(first);
  });

  it('moves the held column left on ArrowLeft', () => {
    const { result } = renderHook(() => useColumnOrder());
    const [first, second] = result.current.columnOrder;

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), second));
    act(() => result.current.handleHandleKeyDown(keyDown('ArrowLeft'), second));

    expect(result.current.columnOrder[0]).toBe(second);
    expect(result.current.columnOrder[1]).toBe(first);
  });

  it('does not move beyond the first position', () => {
    const { result } = renderHook(() => useColumnOrder());
    const first = result.current.columnOrder[0];
    const original = [...result.current.columnOrder];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), first));
    act(() => result.current.handleHandleKeyDown(keyDown('ArrowLeft'), first));

    expect(result.current.columnOrder).toEqual(original);
  });

  it('does not move beyond the last position', () => {
    const { result } = renderHook(() => useColumnOrder());
    const last = result.current.columnOrder[result.current.columnOrder.length - 1];
    const original = [...result.current.columnOrder];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), last));
    act(() => result.current.handleHandleKeyDown(keyDown('ArrowRight'), last));

    expect(result.current.columnOrder).toEqual(original);
  });

  it('drops the column on Enter while held', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));
    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));

    expect(result.current.heldKey).toBeNull();
  });

  it('announces drop with position', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));
    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));

    expect(result.current.announcement).toMatch(/dropped at position/i);
  });

  it('cancels reorder on Escape', () => {
    const { result } = renderHook(() => useColumnOrder());
    const col = result.current.columnOrder[0];

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), col));
    act(() => result.current.handleHandleKeyDown(keyDown('Escape'), col));

    expect(result.current.heldKey).toBeNull();
    expect(result.current.announcement).toMatch(/cancelled/i);
  });

  it('ignores Enter/Space on a different column while one is already held', () => {
    const { result } = renderHook(() => useColumnOrder());
    const [first, second] = result.current.columnOrder;

    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), first));
    act(() => result.current.handleHandleKeyDown(keyDown('Enter'), second));

    // first is still held — pressing Enter on second does nothing
    expect(result.current.heldKey).toBe(first);
  });
});
