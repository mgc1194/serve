// pages/transactions/transactions-table/index.tsx — Transactions data table.
//
// Sorting is server-side — sort state is owned by TransactionsPage and passed
// as props. Column reordering remains client-side via useColumnOrder.
//
// ARIA:
//   • Each <th> has role="columnheader" and aria-sort="ascending|descending|none".
//   • The drag handle button has aria-pressed to reflect picked-up state.
//   • An aria-live="polite" region announces reorder operations.

import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  Tooltip,
  Typography,
} from '@mui/material';

import { type ColumnKey } from '@pages/transactions/transactions-table/columns';
import { TransactionRow } from '@pages/transactions/transactions-table/transaction-row';
import { TransactionsTableHeader } from '@pages/transactions/transactions-table/transactions-table-header';
import { useColumnOrder } from '@pages/transactions/transactions-table/use-column-order';
import { columnKeyToSortField, nextSortDir } from '@pages/transactions/transactions-table/use-sort';
import type { Label, SortDir, SortField, Transaction } from '@serve/types/global';

interface TransactionsTableProps {
  transactions: Transaction[];
  labels?: Label[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
  onImport: () => void;
  // Pagination
  count: number;
  offset: number;
  page: number;
  pageSize: number;
  nextCursor: string | null;
  previousCursor: string | null;
  onNextPage: () => void;
  onPreviousPage: () => void;
  // Sort (server-side — owned by the page)
  sortKey: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField, dir: SortDir) => void;
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
  count,
  offset,
  page,
  pageSize,
  nextCursor,
  previousCursor,
  onNextPage,
  onPreviousPage,
  sortKey,
  sortDir,
  onSortChange,
}: TransactionsTableProps) {
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
      const field = columnKeyToSortField(key);
      onSortChange(field, nextSortDir(sortKey as ColumnKey, key, sortDir));
    }
  }

  const hasPreviousPage = previousCursor != null;
  const hasNextPage = nextCursor != null;

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
          <>
            <Table size="small">
              <TransactionsTableHeader
                columnOrder={columnOrder}
                sortKey={sortKey as ColumnKey}
                sortDir={sortDir}
                dragOver={dragOver}
                heldKey={heldKey}
                onMouseDown={handleMouseDown}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onHeaderClick={(e, key) =>
                  handleHeaderClick(e, key, k => {
                    const field = columnKeyToSortField(k);
                    onSortChange(field, nextSortDir(sortKey as ColumnKey, k, sortDir));
                  })
                }
                onHeaderKeyDown={handleHeaderKeyDown}
                onHandleKeyDown={handleHandleKeyDown}
              />
              <TableBody>
                {transactions.map(tx => (
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

            {/* Pagination controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {(() => {
                  // Use exact offset when the backend provides it (date sort).
                  // Fall back to page-based calculation for other sort fields.
                  const from = offset > 0 ? offset + 1 : (page - 1) * pageSize + 1;
                  const to = offset > 0
                    ? offset + transactions.length
                    : (page - 1) * pageSize + transactions.length;
                  if (from === 1 && to === count) {
                    return `${count.toLocaleString()} transaction${count !== 1 ? 's' : ''}`;
                  }
                  return `${from.toLocaleString()}–${to.toLocaleString()} of ${count.toLocaleString()} transactions`;
                })()}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Previous page">
                  <span>
                    <IconButton
                      size="small"
                      onClick={onPreviousPage}
                      disabled={!hasPreviousPage}
                      aria-label="Previous page"
                    >
                      <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next page">
                  <span>
                    <IconButton
                      size="small"
                      onClick={onNextPage}
                      disabled={!hasNextPage}
                      aria-label="Next page"
                    >
                      <NavigateNextIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </>
  );
}

// ── Private sub-components ────────────────────────────────────────────────────

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
