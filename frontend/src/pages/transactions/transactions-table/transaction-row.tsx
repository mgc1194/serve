// pages/transactions/transactions-table/transaction-row.tsx — Single
// transaction row. Maps the current column order to the appropriate cell
// component. The Actions cell is always pinned last. Inline errors from any
// cell bubble up here and are shown in a full-width error row beneath.

import { Alert, Chip, TableCell, TableRow, Typography } from '@mui/material';
import { useRef, useState } from 'react';

import { type ColumnKey } from '@pages/transactions/transactions-table/columns';
import { TransactionActionsCell } from '@pages/transactions/transactions-table/transaction-actions-cell';
import { TransactionConceptCell } from '@pages/transactions/transactions-table/transaction-concept-cell';
import { TransactionLabelCell } from '@pages/transactions/transactions-table/transaction-label-cell';
import type { Label, Transaction } from '@serve/types/global';

interface TransactionRowProps {
  transaction: Transaction;
  columnOrder: ColumnKey[];
  labels?: Label[];
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
}

/** Formats an ISO date string (YYYY-MM-DD) as a short locale date. */
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats a signed float as currency. */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));
}

export function TransactionRow({
  transaction,
  columnOrder,
  labels = [],
  onUpdated,
  onDeleted,
}: TransactionRowProps) {
  // Single error slot shared across all cells in this row.
  const [rowError, setRowError] = useState<string | null>(null);

  // TransactionConceptCell registers its startEditing function here each render
  // so TransactionActionsCell can trigger it without lifting edit state up.
  const startEditingRef = useRef<(() => void) | null>(null);

  // +1 for the pinned Actions column
  const colspan = columnOrder.length + 1;

  function renderCell(key: ColumnKey) {
    switch (key) {
      case 'date':
        return (
          <TableCell key="date" sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
            <Typography variant="body2" color="text.secondary">
              {formatDate(transaction.date)}
            </Typography>
          </TableCell>
        );

      case 'concept':
        return (
          <TransactionConceptCell
            key="concept"
            transaction={transaction}
            onUpdated={onUpdated}
            onError={setRowError}
            startEditingRef={startEditingRef}
          />
        );

      case 'amount': {
        const isCredit = transaction.amount >= 0;
        return (
          <TableCell key="amount" sx={{ py: 1.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontVariantNumeric: 'tabular-nums',
                color: isCredit ? 'success.main' : 'error.main',
                fontWeight: 500,
              }}
            >
              {isCredit ? '+' : '−'}{formatAmount(transaction.amount)}
            </Typography>
          </TableCell>
        );
      }

      case 'account':
        return (
          <TableCell key="account" sx={{ py: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {transaction.account_name}
            </Typography>
          </TableCell>
        );

      case 'label':
        return (
          <TransactionLabelCell
            key="label"
            transaction={transaction}
            labels={labels}
            onUpdated={onUpdated}
            onError={setRowError}
          />
        );

      case 'category':
        return (
          <TableCell key="category" sx={{ py: 1.5 }}>
            {transaction.category ? (
              <Chip label={transaction.category} size="small" variant="outlined" />
            ) : (
              <Typography variant="body2" color="text.disabled">—</Typography>
            )}
          </TableCell>
        );
    }
  }

  return (
    <>
      <TableRow sx={{ '&:last-child td': { border: 0 } }}>
        {columnOrder.map(key => renderCell(key))}

        <TransactionActionsCell
          transaction={transaction}
          onStartEditing={() => startEditingRef.current?.()}
          onDeleted={onDeleted}
          onError={setRowError}
        />
      </TableRow>

      {rowError && (
        <TableRow>
          <TableCell colSpan={colspan} sx={{ py: 0, border: 0 }}>
            <Alert severity="error" onClose={() => setRowError(null)} sx={{ borderRadius: 0 }}>
              {rowError}
            </Alert>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
