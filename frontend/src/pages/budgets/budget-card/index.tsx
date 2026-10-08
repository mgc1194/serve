// pages/budgets/budget-card/index.tsx — Card for a single budget in the
// Budgets list. Mirrors households/household-detailed-card's shape: a
// header with inline rename, and a footer with a "View budget" link (to
// the per-category planned-vs-actual detail page) alongside the deactivate
// action — simplified since a budget has no members or linked accounts the
// way a household does.

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  OutlinedInput,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { Budget } from '@serve/types/global';
import { deleteBudget, updateBudget, ApiError } from '@services/budgets';

const TYPE_LABELS: Record<Budget['type'], string> = {
  period: 'Period',
  project: 'Project',
};

// Matches transaction-row.tsx's formatDate, for consistency across the
// app. Appending T00:00:00 forces local-time parsing of the bare
// YYYY-MM-DD date — without it, `new Date(iso)` parses as UTC midnight,
// which can display as the previous day in negative-UTC-offset timezones.
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${formatDate(budget.period_start)} – ${formatDate(budget.period_end)}`;
}

interface BudgetCardProps {
  budget: Budget;
  onUpdated: (budget: Budget) => void;
  onDeactivated: (id: number) => void;
}

export function BudgetCard({ budget, onUpdated, onDeactivated }: BudgetCardProps) {
  const navigate = useNavigate();

  // Rename
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(budget.name);
  const [isSaving, setIsSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // The Rename button that opened edit mode unmounts, so keyboard/screen
  // reader users need the new input to pick up focus itself.
  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  // Deactivate (soft delete)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  function startEditing() {
    setEditName(budget.name);
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
    if (trimmed === budget.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setRenameError(null);
    try {
      const updated = await updateBudget(budget.id, { name: trimmed });
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Could not rename budget.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      await deleteBudget(budget.id);
      onDeactivated(budget.id);
    } catch (err) {
      setDeactivateError(err instanceof ApiError ? err.message : 'Could not deactivate budget.');
      setConfirmDeactivate(false);
    } finally {
      setIsDeactivating(false);
    }
  }

  const period = formatPeriod(budget);

  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        {isEditing ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OutlinedInput
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') cancelEditing();
                }}
                size="small"
                disabled={isSaving}
                inputRef={nameInputRef}
                inputProps={{ 'aria-label': 'Budget name' }}
                sx={{
                  fontSize: '1.25rem',
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  flex: 1,
                }}
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
                    {isSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
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
            {renameError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRenameError(null)}>
                {renameError}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              component="h4"
              sx={{ fontFamily: '"DM Serif Display", Georgia, serif', flex: 1 }}
            >
              {budget.name}
            </Typography>
            <Tooltip title="Rename">
              <IconButton
                onClick={startEditing}
                size="small"
                aria-label="Rename"
                sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <Chip label={TYPE_LABELS[budget.type]} size="small" sx={{ fontWeight: 500 }} />
          {period && (
            <Typography variant="body2" color="text.secondary">
              {period}
            </Typography>
          )}
        </Box>
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {deactivateError ? (
          <Alert severity="error" sx={{ flex: 1 }} onClose={() => setDeactivateError(null)}>
            {deactivateError}
          </Alert>
        ) : confirmDeactivate ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Deactivate <strong>{budget.name}</strong>?
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleDeactivate}
              disabled={isDeactivating}
              startIcon={isDeactivating ? <CircularProgress size={14} color="inherit" /> : null}
              aria-label="Yes, deactivate"
            >
              Yes, deactivate
            </Button>
            <Button size="small" onClick={() => setConfirmDeactivate(false)} disabled={isDeactivating}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="small" onClick={() => navigate(`/budgets/${budget.id}`)}>
              View budget
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              color="error"
              onClick={() => setConfirmDeactivate(true)}
              aria-label="Deactivate budget"
            >
              Deactivate budget
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
}
