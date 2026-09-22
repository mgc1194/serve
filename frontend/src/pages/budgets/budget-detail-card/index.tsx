// pages/budgets/budget-detail-card/index.tsx — Full management card for a
// single budget. Mirrors households/household-detailed-card's shape: header
// with inline rename, a section (here: tracked categories), and a footer
// deactivate action — simplified since a budget has no members or linked
// accounts the way a household does.

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
import { useEffect, useState } from 'react';

import { BudgetCategoriesSection } from '@pages/budgets/budget-detail-card/budget-categories-section';
import type { Budget, BudgetLine } from '@serve/types/global';
import { deleteBudget, listBudgetLines, updateBudget, ApiError } from '@services/budgets';

const TYPE_LABELS: Record<Budget['type'], string> = {
  spending: 'Spending',
  earning: 'Earning',
  project: 'Project',
};

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${budget.period_start} – ${budget.period_end}`;
}

interface BudgetDetailCardProps {
  budget: Budget;
  onUpdated: (budget: Budget) => void;
  onDeleted: (id: number) => void;
}

export function BudgetDetailCard({ budget, onUpdated, onDeleted }: BudgetDetailCardProps) {
  // Rename
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(budget.name);
  const [isSaving, setIsSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete (soft — deactivate)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Lines — fetched on mount; updated optimistically as the section reports changes.
  const [lines, setLines] = useState<BudgetLine[]>([]);
  useEffect(() => {
    listBudgetLines(budget.id)
      .then(setLines)
      .catch(() => {
        /* non-fatal — section shows empty state */
      });
    // budget.id is stable for the lifetime of this card instance

  }, [budget.id]);

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

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteBudget(budget.id);
      onDeleted(budget.id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not deactivate budget.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const period = formatPeriod(budget);

  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      {/* Header — name + rename */}
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

      {/* Categories */}
      <Box sx={{ px: 3, py: 2 }}>
        <BudgetCategoriesSection
          budgetId={budget.id}
          householdId={budget.household_id}
          lines={lines}
          onLinesChanged={setLines}
        />
      </Box>

      <Divider />

      {/* Footer — deactivate */}
      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {deleteError ? (
          <Alert severity="error" sx={{ flex: 1 }} onClose={() => setDeleteError(null)}>
            {deleteError}
          </Alert>
        ) : confirmDelete ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Deactivate <strong>{budget.name}</strong>?
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={14} color="inherit" /> : null}
              aria-label="Yes, deactivate"
            >
              Yes, deactivate
            </Button>
            <Button size="small" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              color="error"
              onClick={() => setConfirmDelete(true)}
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
