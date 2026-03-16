// pages/transactions/transactions-table.tsx — Transactions data table.
//
// Supports both pointer and keyboard interactions on column headers:
//
//   Sorting   — Click or Enter/Space on any header to sort by that column.
//               A second activation on the same column toggles asc ↔ desc.
//
//   Reordering — Click/Enter/Space on the drag-handle icon to "pick up" a
//               column (announced to screen readers via aria-live). While a
//               column is held, Left/Right arrows move it one position at a
//               time; Enter/Space drops it; Escape cancels. Pointer drag-and-
//               drop continues to work in parallel.
//
// ARIA:
//   • <thead> has role="rowgroup"; each <th> has role="columnheader".
//   • aria-sort="ascending|descending|none" on every sortable header.
//   • The drag handle button has aria-pressed to reflect picked-up state.
//   • An aria-live="polite" region announces reorder operations.

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';

import { type ColumnKey, COLUMN_LABELS, DEFAULT_COLUMN_ORDER } from '@pages/transactions/columns';
import { TransactionRow } from '@pages/transactions/transaction-row';
import type { Transaction } from '@serve/types/global';

// ── Sorting ───────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function sortTransactions(
  txns: Transaction[],
  key: ColumnKey,
  dir: SortDir,
): Transaction[] {
  return [...txns].sort((a, b) => {
    let av: string | number;
    let bv: string | number;

    switch (key) {
      case 'date':     av = a.date;                           bv = b.date;                           break;
      case 'concept':  av = a.concept.toLowerCase();          bv = b.concept.toLowerCase();          break;
      case 'amount':   av = a.amount;                         bv = b.amount;                         break;
      case 'account':  av = a.account_name.toLowerCase();     bv = b.account_name.toLowerCase();     break;
      case 'label':    av = a.label?.toLowerCase()    ?? '';  bv = b.label?.toLowerCase()    ?? '';  break;
      case 'category': av = a.category?.toLowerCase() ?? '';  bv = b.category?.toLowerCase() ?? '';  break;
    }

    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
  onImport: () => void;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const HEADER_CELL_SX = {
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  userSelect: 'none' as const,
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'middle',
};

const DRAG_THRESHOLD = 6; // px — pointer delta below this is treated as a click

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsTable({
  transactions,
  isLoading,
  error,
  onRetry,
  onUpdated,
  onDeleted,
  onImport,
}: TransactionsTableProps) {
  // ── Column order ────────────────────────────────────────────────────────────
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);

  // Pointer drag state
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null);
  const dragKey = useRef<ColumnKey | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // Keyboard reorder state — null means nothing is held
  const [heldKey, setHeldKey] = useState<ColumnKey | null>(null);

  // ── Sort state — default mirrors server: date desc ──────────────────────────
  const [sortKey, setSortKey] = useState<ColumnKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── aria-live announcement ──────────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState('');

  // ── Pointer drag handlers ───────────────────────────────────────────────────

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

  // ── Sort handler (click or keyboard) ───────────────────────────────────────

  function applySort(key: ColumnKey) {
    setSortDir(prev => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
    setSortKey(key);
  }

  function handleHeaderClick(e: React.MouseEvent, key: ColumnKey) {
    if (didDrag.current) return;
    const down = mouseDownPos.current;
    if (down) {
      const dx = Math.abs(e.clientX - down.x);
      const dy = Math.abs(e.clientY - down.y);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) return;
    }
    applySort(key);
  }

  function handleHeaderKeyDown(e: React.KeyboardEvent, key: ColumnKey) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      applySort(key);
    }
  }

  // ── Keyboard reorder handlers (on the drag-handle IconButton) ───────────────

  function handleHandleKeyDown(e: React.KeyboardEvent, key: ColumnKey) {
    // Enter or Space: pick up / drop
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // don't also trigger the header's sort
      if (heldKey === null) {
        setHeldKey(key);
        setAnnouncement(
          `${COLUMN_LABELS[key]} column picked up. Use Left and Right arrow keys to move, Enter or Space to drop, Escape to cancel.`,
        );
      } else {
        setAnnouncement(
          `${COLUMN_LABELS[heldKey]} column dropped at position ${columnOrder.indexOf(key) + 1}.`,
        );
        setHeldKey(null);
      }
      return;
    }

    // Escape: cancel
    if (e.key === 'Escape' && heldKey !== null) {
      e.preventDefault();
      setAnnouncement(`${COLUMN_LABELS[heldKey]} column reorder cancelled.`);
      setHeldKey(null);
      return;
    }

    // Arrow keys: move the held column
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function reorder(order: ColumnKey[], from: ColumnKey, to: ColumnKey): ColumnKey[] {
    const next = [...order];
    const fromIdx = next.indexOf(from);
    const toIdx = next.indexOf(to);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    return next;
  }

  const sorted = sortTransactions(transactions, sortKey, sortDir);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Screen-reader live region for reorder announcements */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {announcement}
      </Box>

      <Paper
        elevation={0}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
      >
        {isLoading ? (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={onRetry}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No transactions yet.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={onImport}
            >
              Import a CSV
            </Button>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {columnOrder.map(key => {
                  const isActive = sortKey === key;
                  const isHeld = heldKey === key;
                  const SortIcon = sortDir === 'asc' ? ArrowUpwardIcon : ArrowDownwardIcon;
                  const ariaSort = isActive
                    ? sortDir === 'asc' ? 'ascending' : 'descending'
                    : 'none';

                  return (
                    <TableCell
                      key={key}
                      component="th"
                      scope="col"
                      role="columnheader"
                      aria-sort={ariaSort}
                      draggable
                      onMouseDown={handleMouseDown}
                      onClick={e => handleHeaderClick(e, key)}
                      onKeyDown={e => handleHeaderKeyDown(e, key)}
                      onDragStart={() => handleDragStart(key)}
                      onDragOver={e => handleDragOver(e, key)}
                      onDrop={() => handleDrop(key)}
                      onDragEnd={handleDragEnd}
                      tabIndex={0}
                      sx={{
                        ...HEADER_CELL_SX,
                        cursor: 'pointer',
                        ...(key === 'amount' ? { textAlign: 'right' } : {}),
                        color: isActive ? 'primary.main' : 'text.secondary',
                        outline: dragOver === key ? '2px solid' : 'none',
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
                          justifyContent: key === 'amount' ? 'flex-end' : 'flex-start',
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
                            aria-label={`Reorder ${COLUMN_LABELS[key]} column`}
                            aria-pressed={isHeld}
                            onKeyDown={e => handleHandleKeyDown(e, key)}
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

                        {COLUMN_LABELS[key]}

                        {isActive && (
                          <SortIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                        )}
                      </Box>
                    </TableCell>
                  );
                })}

                {/* Actions — pinned, not sortable or reorderable */}
                <TableCell
                  component="th"
                  scope="col"
                  sx={{ ...HEADER_CELL_SX, color: 'text.secondary', cursor: 'default' }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(tx => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  columnOrder={columnOrder}
                  onUpdated={onUpdated}
                  onDeleted={onDeleted}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </>
  );
}
