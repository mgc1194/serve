// pages/transactions/transactions-table/index.tsx — Transactions data table.
//
// Supports both pointer and keyboard interactions on column headers:
//
//   Sorting    — Click or Enter/Space on any header to sort by that column.
//                A second activation on the same column toggles asc ↔ desc.
//
//   Reordering — Click/Enter/Space on the drag-handle icon to "pick up" a
//                column (announced to screen readers via aria-live). While a
//                column is held, Left/Right arrows move it one position at a
//                time; Enter/Space drops it; Escape cancels. Pointer drag-and-
//                drop continues to work in parallel.
//
// ARIA:
//   • Each <th> has role="columnheader" and aria-sort="ascending|descending|none".
//   • The drag handle button has aria-pressed to reflect picked-up state.
//   • An aria-live="polite" region announces reorder operations.

import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Table,
  TableBody,
  Typography,
} from '@mui/material';

import { type ColumnKey } from '@pages/transactions/transactions-table/columns';
import { TransactionRow } from '@pages/transactions/transactions-table/transaction-row';
import { TransactionsTableHeader } from '@pages/transactions/transactions-table/transactions-table-header';
import { useColumnOrder } from '@pages/transactions/transactions-table/use-column-order';
import { sortTransactions, useSort } from '@pages/transactions/transactions-table/use-sort';
import type { Label, Transaction } from '@serve/types/global';

interface TransactionsTableProps {
  transactions: Transaction[];
  labels?: Label[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
  onImport: () => void;
}

export function TransactionsTable({
  transactions,
  labels = [],
  isLoading,
  error,
  onRetry,
  onUpdated,
  onDeleted,
  onImport,
}: TransactionsTableProps) {
  const { sortKey, sortDir, applySort } = useSort();
  const {
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
  } = useColumnOrder();

  function handleHeaderKeyDown(e: React.KeyboardEvent, key: ColumnKey) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      applySort(key);
    }
  }

  const sorted = sortTransactions(transactions, sortKey, sortDir);

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
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : transactions.length === 0 ? (
          <EmptyState onImport={onImport} />
        ) : (
          <Table size="small">
            <TransactionsTableHeader
              columnOrder={columnOrder}
              sortKey={sortKey}
              sortDir={sortDir}
              dragOver={dragOver}
              heldKey={heldKey}
              onMouseDown={handleMouseDown}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onHeaderClick={(e, key) => handleHeaderClick(e, key, applySort)}
              onHeaderKeyDown={handleHeaderKeyDown}
              onHandleKeyDown={handleHandleKeyDown}
            />
            <TableBody>
              {sorted.map(tx => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  columnOrder={columnOrder}
                  labels={labels}
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

// ── Private sub-components for non-table states ────────────────────────────────

function LoadingSkeleton() {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Skeleton key={i} variant="rounded" height={44} />
      ))}
    </Box>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
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
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        No transactions yet.
      </Typography>
      <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={onImport}>
        Import a CSV
      </Button>
    </Box>
  );
}
