// pages/transactions/transaction-row.tsx — Single transaction row with inline
// concept edit and confirm-delete.
//
// Renders data cells in the order specified by the `columnOrder` prop, which
// is owned by TransactionsTable and updated via drag-and-drop. The Actions
// cell is always rendered last and is not part of the column order.

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  IconButton,
  OutlinedInput,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { type ColumnKey } from '@pages/transactions/columns';
import type { Transaction } from '@serve/types/global';
import { updateTransactionConcept, deleteTransaction, ApiError } from '@services/transactions';

interface TransactionRowProps {
  transaction: Transaction;
  columnOrder: ColumnKey[];
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

/** Formats a signed float as currency, coloring debits red and credits green. */
function AmountCell({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));

  const isCredit = amount >= 0;
  return (
    <Typography
      component="span"
      variant="body2"
      sx={{
        fontVariantNumeric: 'tabular-nums',
        color: isCredit ? 'success.main' : 'error.main',
        fontWeight: 500,
      }}
    >
      {isCredit ? '+' : '−'}{formatted}
    </Typography>
  );
}

export function TransactionRow({
  transaction,
  columnOrder,
  onUpdated,
  onDeleted,
}: TransactionRowProps) {
  // Edit concept
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(transaction.concept);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function startEditing() {
    setEditConcept(transaction.concept);
    setEditError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditError(null);
  }

  async function handleSave() {
    const trimmed = editConcept.trim();
    if (!trimmed) return;
    if (trimmed === transaction.concept) { setIsEditing(false); return; }

    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateTransactionConcept(transaction.id, trimmed);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : 'Could not update transaction.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTransaction(transaction.id);
      onDeleted(transaction.id);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'Could not delete transaction.',
      );
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  // +1 for the pinned Actions column
  const COLSPAN = columnOrder.length + 1;

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
          <TableCell key="concept" sx={{ py: 1.5, minWidth: 200 }}>
            {isEditing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OutlinedInput
                  inputRef={inputRef}
                  value={editConcept}
                  onChange={e => setEditConcept(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  size="small"
                  disabled={isSaving}
                  sx={{ fontSize: '0.875rem' }}
                />
                <Tooltip title="Save">
                  <span>
                    <IconButton
                      onClick={handleSave}
                      disabled={isSaving || !editConcept.trim()}
                      color="primary"
                      size="small"
                      aria-label="Save"
                    >
                      {isSaving ? (
                        <CircularProgress size={16} />
                      ) : (
                        <CheckIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton
                    onClick={cancelEditing}
                    disabled={isSaving}
                    size="small"
                    aria-label="Cancel"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Typography variant="body2">{transaction.concept}</Typography>
            )}
          </TableCell>
        );

      case 'amount':
        return (
          <TableCell key="amount" sx={{ py: 1.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
            <AmountCell amount={transaction.amount} />
          </TableCell>
        );

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
          <TableCell key="label" sx={{ py: 1.5 }}>
            {transaction.label ? (
              <Chip label={transaction.label} size="small" color="primary" variant="outlined" />
            ) : (
              <Typography variant="body2" color="text.disabled">—</Typography>
            )}
          </TableCell>
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

        {/* Actions — always last */}
        <TableCell sx={{ py: 1.5 }}>
          {confirmDelete ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Delete?
              </Typography>
              <Button
                size="small"
                color="error"
                variant="contained"
                onClick={handleDelete}
                disabled={isDeleting}
                sx={{ minWidth: 0, px: 1.5, py: 0.25, fontSize: '0.75rem' }}
              >
                {isDeleting ? <CircularProgress size={14} color="inherit" /> : 'Yes'}
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.75rem' }}
              >
                No
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Edit description">
                <IconButton size="small" onClick={startEditing} aria-label="Edit description">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete transaction"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </TableCell>
      </TableRow>

      {/* Inline error rows */}
      {(editError || deleteError) && (
        <TableRow>
          <TableCell colSpan={COLSPAN} sx={{ py: 0, border: 0 }}>
            <Alert
              severity="error"
              onClose={() => {
                setEditError(null);
                setDeleteError(null);
              }}
              sx={{ borderRadius: 0 }}
            >
              {editError ?? deleteError}
            </Alert>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
