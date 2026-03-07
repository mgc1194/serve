// pages/accounts/account-row.tsx — Single account row with inline rename and delete.

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

import type { AccountDetail } from '@serve/types/global';
import { renameAccount, deleteAccount, ApiError } from '@services/accounts';

interface AccountRowProps {
  account: AccountDetail;
  onUpdated: (account: AccountDetail) => void;
  onDeleted: (id: number) => void;
}

export function AccountRow({ account, onUpdated, onDeleted }: AccountRowProps) {
  // Rename
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [isSaving, setIsSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) renameInputRef.current?.focus();
  }, [isEditing]);

  function startEditing() {
    setEditName(account.name);
    setRenameError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setRenameError(null);
  }

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === account.name) { setIsEditing(false); return; }

    setIsSaving(true);
    setRenameError(null);
    try {
      const updated = await renameAccount(account.id, trimmed);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Could not rename account.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(account.id);
      onDeleted(account.id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete account.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <TableRow sx={{ '&:last-child td': { border: 0 } }}>
        {/* Name */}
        <TableCell sx={{ py: 1.5 }}>
          {isEditing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <OutlinedInput
                inputRef={renameInputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') cancelEditing();
                }}
                size="small"
                disabled={isSaving}
                sx={{ fontSize: '0.875rem' }}
              />
              <Tooltip title="Save">
                <span>
                  <IconButton
                    onClick={handleRename}
                    disabled={isSaving || !editName.trim()}
                    color="primary"
                    size="small"
                    aria-label="Save"
                  >
                    {isSaving ? <CircularProgress size={14} /> : <CheckIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton onClick={cancelEditing} size="small" aria-label="Cancel">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Typography variant="body2" fontWeight={500}>
              {account.name}
            </Typography>
          )}
          {renameError && (
            <Alert
              severity="error"
              sx={{ mt: 0.5, py: 0 }}
              onClose={() => setRenameError(null)}
            >
              {renameError}
            </Alert>
          )}
        </TableCell>

        {/* Bank */}
        <TableCell sx={{ py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {account.bank_name}
          </Typography>
        </TableCell>

        {/* Account type */}
        <TableCell sx={{ py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {account.account_type}
          </Typography>
        </TableCell>

        {/* Household */}
        <TableCell sx={{ py: 1.5 }}>
          <Chip
            label={account.household_name}
            size="small"
            sx={{
              bgcolor: 'secondary.light',
              color: 'secondary.dark',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        </TableCell>

        {/* Actions */}
        <TableCell align="right" sx={{ py: 1.5, whiteSpace: 'nowrap' }}>
          {deleteError ? (
            <Alert
              severity="error"
              sx={{ py: 0 }}
              onClose={() => setDeleteError(null)}
            >
              {deleteError}
            </Alert>
          ) : confirmDelete ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Delete?
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Yes, delete"
              >
                {isDeleting ? <CircularProgress size={14} color="inherit" /> : 'Yes'}
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                aria-label="Cancel delete"
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <>
              {!isEditing && (
                <Tooltip title="Rename">
                  <IconButton
                    onClick={startEditing}
                    size="small"
                    aria-label="Rename account"
                    sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Delete">
                <IconButton
                  onClick={() => setConfirmDelete(true)}
                  size="small"
                  aria-label="Delete account"
                  sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}
