// pages/transactions/transactions-table/transaction-concept-cell.tsx —
// Renders the concept (description) column. In view mode shows plain text.
// In edit mode provides an inline input with save/cancel controls. Exposes a
// startEditing trigger via a ref so the actions cell can activate it without
// lifting state up.

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  CircularProgress,
  IconButton,
  OutlinedInput,
  TableCell,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { Transaction } from '@serve/types/global';
import { ApiError, updateTransactionConcept } from '@services/transactions';

interface TransactionConceptCellProps {
  transaction: Transaction;
  onUpdated: (transaction: Transaction) => void;
  onError: (message: string | null) => void;
  /** Populated each render with startEditing so the actions cell can trigger it. */
  startEditingRef: React.MutableRefObject<(() => void) | null>;
}

export function TransactionConceptCell({
  transaction,
  onUpdated,
  onError,
  startEditingRef,
}: TransactionConceptCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(transaction.concept);
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function startEditing() {
    setEditConcept(transaction.concept);
    onError(null);
    setIsEditing(true);
  }

  // Register on the ref every render so TransactionRow can forward it to
  // TransactionActionsCell without lifting edit state up.
  useEffect(() => {
    startEditingRef.current = startEditing;
  });

  function cancelEditing() {
    setIsEditing(false);
    onError(null);
  }

  async function handleSave() {
    const trimmed = editConcept.trim();
    if (!trimmed) return;
    if (trimmed === transaction.concept) { setIsEditing(false); return; }

    setIsSaving(true);
    onError(null);
    try {
      const updated = await updateTransactionConcept(transaction.id, trimmed);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not update transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <TableCell sx={{ py: 1.5, minWidth: 200 }}>
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
                {isSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel">
            <IconButton onClick={cancelEditing} disabled={isSaving} size="small" aria-label="Cancel">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    );
  }

  return (
    <TableCell sx={{ py: 1.5, minWidth: 200 }}>
      <Typography variant="body2">{transaction.concept}</Typography>
    </TableCell>
  );
}
