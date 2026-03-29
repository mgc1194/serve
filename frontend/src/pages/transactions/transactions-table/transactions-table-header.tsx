// pages/transactions/transactions-table/transactions-table-header.tsx —
// Renders the full <TableHead> row, delegating each sortable/reorderable
// column to <TableHeaderCell> and appending the pinned Actions column.

import { TableCell, TableHead, TableRow } from '@mui/material';

import { type ColumnKey } from '@pages/transactions/transactions-table/columns';
import { TableHeaderCell } from '@pages/transactions/transactions-table/table-header-cell';
import type { SortDir } from '@pages/transactions/transactions-table/use-sort';

const HEADER_CELL_SX = {
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  userSelect: 'none' as const,
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'middle',
};

interface TransactionsTableHeaderProps {
  columnOrder: ColumnKey[];
  sortKey: ColumnKey;
  sortDir: SortDir;
  dragOver: ColumnKey | null;
  heldKey: ColumnKey | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onDragStart: (key: ColumnKey) => void;
  onDragOver: (e: React.DragEvent, key: ColumnKey) => void;
  onDrop: (key: ColumnKey) => void;
  onDragEnd: () => void;
  onHeaderClick: (e: React.MouseEvent, key: ColumnKey) => void;
  onHeaderKeyDown: (e: React.KeyboardEvent, key: ColumnKey) => void;
  onHandleKeyDown: (e: React.KeyboardEvent, key: ColumnKey) => void;
}

export function TransactionsTableHeader({
  columnOrder,
  sortKey,
  sortDir,
  dragOver,
  heldKey,
  onMouseDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onHeaderClick,
  onHeaderKeyDown,
  onHandleKeyDown,
}: TransactionsTableHeaderProps) {
  return (
    <TableHead>
      <TableRow sx={{ bgcolor: 'grey.50' }}>
        {columnOrder.map(key => (
          <TableHeaderCell
            key={key}
            columnKey={key}
            sortKey={sortKey}
            sortDir={sortDir}
            dragOver={dragOver}
            heldKey={heldKey}
            onMouseDown={onMouseDown}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onHeaderClick={onHeaderClick}
            onHeaderKeyDown={onHeaderKeyDown}
            onHandleKeyDown={onHandleKeyDown}
          />
        ))}

        {/* Actions column — pinned, not sortable or reorderable */}
        <TableCell
          component="th"
          scope="col"
          sx={{ ...HEADER_CELL_SX, color: 'text.secondary', cursor: 'default' }}
        >
          Actions
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
