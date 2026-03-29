// pages/transactions/transactions-table/table-header-cell.tsx — A single
// sortable, drag-and-drop-reorderable column header cell. Receives all
// interaction handlers from the parent so it stays stateless and easy to test.

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box, IconButton, TableCell, Tooltip } from '@mui/material';

import { type ColumnKey, COLUMN_LABELS } from '@pages/transactions/transactions-table/columns';
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

interface TableHeaderCellProps {
  columnKey: ColumnKey;
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

export function TableHeaderCell({
  columnKey,
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
}: TableHeaderCellProps) {
  const isActive = sortKey === columnKey;
  const isHeld = heldKey === columnKey;
  const SortIcon = sortDir === 'asc' ? ArrowUpwardIcon : ArrowDownwardIcon;
  const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <TableCell
      component="th"
      scope="col"
      role="columnheader"
      aria-sort={ariaSort}
      draggable
      onMouseDown={onMouseDown}
      onClick={e => onHeaderClick(e, columnKey)}
      onKeyDown={e => onHeaderKeyDown(e, columnKey)}
      onDragStart={() => onDragStart(columnKey)}
      onDragOver={e => onDragOver(e, columnKey)}
      onDrop={() => onDrop(columnKey)}
      onDragEnd={onDragEnd}
      tabIndex={0}
      sx={{
        ...HEADER_CELL_SX,
        cursor: 'pointer',
        ...(columnKey === 'amount' ? { textAlign: 'right' } : {}),
        color: isActive ? 'primary.main' : 'text.secondary',
        outline: dragOver === columnKey ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        outlineOffset: '-2px',
        transition: 'outline 0.1s, color 0.1s',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '-2px',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          justifyContent: columnKey === 'amount' ? 'flex-end' : 'flex-start',
        }}
      >
        <Tooltip
          title={
            heldKey === null
              ? 'Drag or use keyboard to reorder'
              : isHeld
              ? 'Drop here (Enter/Space) · Cancel (Escape)'
              : 'Move here (←/→)'
          }
          placement="top"
          enterDelay={400}
        >
          <IconButton
            size="small"
            aria-label={`Reorder ${COLUMN_LABELS[columnKey]} column`}
            aria-pressed={isHeld}
            onKeyDown={e => onHandleKeyDown(e, columnKey)}
            onClick={e => e.stopPropagation()} // don't trigger header sort
            tabIndex={0}
            sx={{
              p: 0.25,
              color: isHeld ? 'primary.main' : 'text.disabled',
              '&:hover': { color: 'text.secondary' },
            }}
          >
            <DragIndicatorIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>

        {COLUMN_LABELS[columnKey]}

        {isActive && <SortIcon sx={{ fontSize: 14, flexShrink: 0 }} />}
      </Box>
    </TableCell>
  );
}
