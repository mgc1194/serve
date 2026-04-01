// pages/transactions/transactions-table/transaction-actions-cell.tsx —
// Edit, exclude-from-summary, and delete actions for a transaction row.

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, IconButton, TableCell, Tooltip } from '@mui/material';
import { useState } from 'react';

import { DeleteConfirmation } from '@components/delete-confirmation';
import type { Transaction } from '@serve/types/global';
import { ApiError, deleteTransaction, toggleTransactionExclusion } from '@services/transactions';

interface TransactionActionsCellProps {
  transaction: Transaction;
  onStartEditing: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: number) => void;
  onError: (message: string | null) => void;
}

export function TransactionActionsCell({
  transaction,
  onStartEditing,
  onUpdated,
  onDeleted,
  onError,
}: TransactionActionsCellProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingExclusion, setIsTogglingExclusion] = useState(false);

  async function handleToggleExclusion() {
    setIsTogglingExclusion(true);
    onError(null);
    try {
      const updated = await toggleTransactionExclusion(
        transaction.id,
        !transaction.exclude_from_summary,
      );
      onUpdated(updated);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update transaction.');
    } finally {
      setIsTogglingExclusion(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    onError(null);
    try {
      await deleteTransaction(transaction.id);
      onDeleted(transaction.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not delete transaction.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (confirmDelete) {
    return (
      <TableCell sx={{ py: 1.5 }}>
        <DeleteConfirmation
          prompt="Delete?"
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      </TableCell>
    );
  }

  const isExcluded = transaction.exclude_from_summary;

  return (
    <TableCell sx={{ py: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit description">
          <IconButton size="small" onClick={onStartEditing} aria-label="Edit description">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={isExcluded ? 'Include in summary' : 'Exclude from summary'}>
          <IconButton
            size="small"
            onClick={handleToggleExclusion}
            disabled={isTogglingExclusion}
            aria-label={isExcluded ? 'Include in summary' : 'Exclude from summary'}
            aria-pressed={isExcluded}
            sx={{ color: isExcluded ? 'text.disabled' : 'text.secondary' }}
          >
            {isExcluded
              ? <VisibilityOffOutlinedIcon fontSize="small" />
              : <VisibilityOutlinedIcon fontSize="small" />
            }
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
    </TableCell>
  );
}
