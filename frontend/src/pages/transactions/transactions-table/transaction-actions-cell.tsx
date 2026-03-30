// pages/transactions/transactions-table/transaction-actions-cell.tsx —
// Edit and delete actions for a transaction row. Shows an edit button (triggers
// concept edit mode via a ref) and a delete button that requires a confirmation
// step before committing.

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TableCell,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import type { Transaction } from '@serve/types/global';
import { ApiError, deleteTransaction } from '@services/transactions';

interface TransactionActionsCellProps {
  transaction: Transaction;
  onStartEditing: () => void;
  onDeleted: (id: number) => void;
  onError: (message: string | null) => void;
}

export function TransactionActionsCell({
  transaction,
  onStartEditing,
  onDeleted,
  onError,
}: TransactionActionsCellProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      </TableCell>
    );
  }

  return (
    <TableCell sx={{ py: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit description">
          <IconButton size="small" onClick={onStartEditing} aria-label="Edit description">
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
    </TableCell>
  );
}
