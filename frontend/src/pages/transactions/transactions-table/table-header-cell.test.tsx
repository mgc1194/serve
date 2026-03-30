// pages/transactions/transactions-table/table-header-cell.test.tsx

import { Table, TableHead, TableRow } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TableHeaderCell } from './table-header-cell';

function setup(props: Partial<React.ComponentProps<typeof TableHeaderCell>> = {}) {
  const onMouseDown = vi.fn();
  const onDragStart = vi.fn();
  const onDragOver = vi.fn();
  const onDrop = vi.fn();
  const onDragEnd = vi.fn();
  const onHeaderClick = vi.fn();
  const onHeaderKeyDown = vi.fn();
  const onHandleKeyDown = vi.fn();

  render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell
            columnKey="concept"
            sortKey="date"
            sortDir="desc"
            dragOver={null}
            heldKey={null}
            onMouseDown={onMouseDown}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onHeaderClick={onHeaderClick}
            onHeaderKeyDown={onHeaderKeyDown}
            onHandleKeyDown={onHandleKeyDown}
            {...props}
          />
        </TableRow>
      </TableHead>
    </Table>,
  );

  return { onHeaderClick, onHeaderKeyDown, onHandleKeyDown, onDragStart, onDrop };
}

beforeEach(() => vi.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('TableHeaderCell rendering', () => {
  it('renders the column label', () => {
    setup();
    expect(screen.getByText('Description')).toBeDefined();
  });

  it('shows a sort icon when this column is the active sort', () => {
    setup({ columnKey: 'date', sortKey: 'date', sortDir: 'asc' });
    expect(screen.getByTestId('ArrowUpwardIcon')).toBeDefined();
  });

  it('shows descending sort icon when sortDir is desc', () => {
    setup({ columnKey: 'date', sortKey: 'date', sortDir: 'desc' });
    expect(screen.getByTestId('ArrowDownwardIcon')).toBeDefined();
  });

  it('does not show a sort icon when this column is not active', () => {
    setup({ columnKey: 'concept', sortKey: 'date' });
    expect(screen.queryByTestId('ArrowUpwardIcon')).toBeNull();
    expect(screen.queryByTestId('ArrowDownwardIcon')).toBeNull();
  });

  it('sets aria-sort to ascending when active and asc', () => {
    setup({ columnKey: 'date', sortKey: 'date', sortDir: 'asc' });
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('ascending');
  });

  it('sets aria-sort to descending when active and desc', () => {
    setup({ columnKey: 'date', sortKey: 'date', sortDir: 'desc' });
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('descending');
  });

  it('sets aria-sort to none when not the active column', () => {
    setup({ columnKey: 'concept', sortKey: 'date' });
    expect(screen.getByRole('columnheader').getAttribute('aria-sort')).toBe('none');
  });

  it('shows the drag handle button', () => {
    setup();
    expect(screen.getByRole('button', { name: /reorder description column/i })).toBeDefined();
  });

  it('sets aria-pressed to true on the handle when this column is held', () => {
    setup({ columnKey: 'concept', heldKey: 'concept' });
    const handle = screen.getByRole('button', { name: /reorder description column/i });
    expect(handle.getAttribute('aria-pressed')).toBe('true');
  });

  it('sets aria-pressed to false when a different column is held', () => {
    setup({ columnKey: 'concept', heldKey: 'date' });
    const handle = screen.getByRole('button', { name: /reorder description column/i });
    expect(handle.getAttribute('aria-pressed')).toBe('false');
  });
});

// ── Interactions ──────────────────────────────────────────────────────────────

describe('TableHeaderCell interactions', () => {
  it('calls onHeaderClick when the cell is clicked', () => {
    const { onHeaderClick } = setup();
    fireEvent.click(screen.getByRole('columnheader'));
    expect(onHeaderClick).toHaveBeenCalledOnce();
  });

  it('passes the columnKey to onHeaderClick', () => {
    const { onHeaderClick } = setup({ columnKey: 'amount' });
    fireEvent.click(screen.getByRole('columnheader'));
    expect(onHeaderClick).toHaveBeenCalledWith(expect.anything(), 'amount');
  });

  it('calls onHeaderKeyDown on Enter', () => {
    const { onHeaderKeyDown } = setup();
    fireEvent.keyDown(screen.getByRole('columnheader'), { key: 'Enter' });
    expect(onHeaderKeyDown).toHaveBeenCalledWith(expect.anything(), 'concept');
  });

  it('calls onHeaderKeyDown on Space', () => {
    const { onHeaderKeyDown } = setup();
    fireEvent.keyDown(screen.getByRole('columnheader'), { key: ' ' });
    expect(onHeaderKeyDown).toHaveBeenCalledWith(expect.anything(), 'concept');
  });

  it('does not trigger onHeaderClick when the drag handle is clicked', () => {
    const { onHeaderClick } = setup();
    fireEvent.click(screen.getByRole('button', { name: /reorder description column/i }));
    expect(onHeaderClick).not.toHaveBeenCalled();
  });

  it('calls onHandleKeyDown when a key is pressed on the drag handle', () => {
    const { onHandleKeyDown } = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: /reorder description column/i }), {
      key: 'Enter',
    });
    expect(onHandleKeyDown).toHaveBeenCalledWith(expect.anything(), 'concept');
  });
});
