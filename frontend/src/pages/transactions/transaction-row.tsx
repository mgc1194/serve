// pages/transactions/transaction-row.tsx — Single transaction row with inline
// concept edit, label selector, and confirm-delete.
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
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { type ColumnKey } from '@pages/transactions/columns';
import type { Label, Transaction } from '@serve/types/global';
import {
  ApiError,
  deleteTransaction,
  updateTransactionConcept,
  updateTransactionLabel,
} from '@services/transactions';
import { contrastTextColor } from '@utils/contrast-text-color';

interface TransactionRowProps {
  transaction: Transaction;
  columnOrder: ColumnKey[];
  labels: Label[];
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
}

const UNASSIGNED = '__unassigned__';

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
  labels,
  onUpdated,
  onDeleted,
}: TransactionRowProps) {
  // Edit concept
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(transaction.concept);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Label
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

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

  async function handleLabelChange(e: SelectChangeEvent<string>) {
    const value = e.target.value;
    const newLabelId = value === UNASSIGNED ? null : Number(value);
    const selectedLabel = newLabelId !== null ? labels.find(l => l.id === newLabelId) ?? null : null;

    // Optimistic update.
    const optimistic: Transaction = {
      ...transaction,
      label_id: newLabelId,
      label_name: selectedLabel?.name ?? null,
      label_color: selectedLabel?.color ?? null,
    };
    onUpdated(optimistic);
    setIsUpdatingLabel(true);
    setLabelError(null);

    try {
      const updated = await updateTransactionLabel(transaction.id, newLabelId);
      onUpdated(updated);
    } catch (err) {
      // Revert on failure.
      onUpdated(transaction);
      setLabelError(
        err instanceof ApiError ? err.message : 'Could not update label.',
      );
    } finally {
      setIsUpdatingLabel(false);
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
            <Select
              value={transaction.label_id !== null ? String(transaction.label_id) : UNASSIGNED}
              onChange={handleLabelChange}
              disabled={isUpdatingLabel}
              size="small"
              displayEmpty
              aria-label={`Label for ${transaction.concept}`}
              renderValue={value => {
                if (value === UNASSIGNED || transaction.label_id === null) {
                  return (
                    <Typography variant="body2" color="text.disabled">
                      No label
                    </Typography>
                  );
                }
                const label = labels.find(l => l.id === transaction.label_id);
                const color = label?.color ?? transaction.label_color ?? '#6B7280';
                const name = label?.name ?? transaction.label_name ?? '';
                return (
                  <Chip
                    label={name}
                    size="small"
                    sx={{
                      bgcolor: color,
                      color: contrastTextColor(color),
                      fontWeight: 500,
                      height: 20,
                      pointerEvents: 'none',
                    }}
                  />
                );
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value={UNASSIGNED}>
                <Typography variant="body2" color="text.secondary">
                  No label
                </Typography>
              </MenuItem>
              {labels.map(label => (
                <MenuItem key={label.id} value={String(label.id)}>
                  <Chip
                    label={label.name}
                    size="small"
                    sx={{
                      bgcolor: label.color,
                      color: contrastTextColor(label.color),
                      fontWeight: 500,
                      pointerEvents: 'none',
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
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
      {(editError || labelError || deleteError) && (
        <TableRow>
          <TableCell colSpan={COLSPAN} sx={{ py: 0, border: 0 }}>
            <Alert
              severity="error"
              onClose={() => {
                setEditError(null);
                setLabelError(null);
                setDeleteError(null);
              }}
              sx={{ borderRadius: 0 }}
            >
              {editError ?? labelError ?? deleteError}
            </Alert>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
