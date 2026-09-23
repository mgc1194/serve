// pages/budgets/create-budget-dialog/index.tsx
//
// Opened from a "Create budget" button on the Budgets list page (wired up
// in a follow-up PR). Asks for a type first, then only what that type
// actually needs — a name only makes sense for a Project (an open-ended
// goal with no period to name itself after); Monthly and Period compute
// their own name automatically so the household never has to think one up.
//
// The type dropdown offers Monthly / Period / Project. Monthly and Period
// both create a backend type='period' budget — Monthly is a frontend-only
// convenience that swaps the manual From/To pickers for a single month
// picker; Period keeps the manual range for anything else (a custom or
// weekly window). Weekly isn't offered yet — deferred until there's an
// actual use case for it.

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { BudgetTypeField } from '@pages/budgets/create-budget-dialog/budget-type-field';
import { deriveBudgetName } from '@pages/budgets/create-budget-dialog/derive-budget-name';
import { MonthlyPeriodField } from '@pages/budgets/create-budget-dialog/monthly-period-field';
import { PeriodRangeFields } from '@pages/budgets/create-budget-dialog/period-range-fields';
import { ProjectNameField } from '@pages/budgets/create-budget-dialog/project-name-field';
import type { UiBudgetType } from '@pages/budgets/create-budget-dialog/types';
import type { Budget } from '@serve/types/global';
import { createBudget, ApiError } from '@services/budgets';

interface CreateBudgetDialogProps {
  open: boolean;
  householdId: number;
  onClose: () => void;
  onCreate: (budget: Budget) => void;
}

export function CreateBudgetDialog({
  open,
  householdId,
  onClose,
  onCreate,
}: CreateBudgetDialogProps) {
  const [uiType, setUiType] = useState<UiBudgetType>('monthly');
  const [periodStart, setPeriodStart] = useState<string | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<string | undefined>(undefined);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setUiType('monthly');
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
    setProjectName('');
    setError(null);
  }

  function handleClose() {
    if (isCreating) return;
    reset();
    onClose();
  }

  const derivedName = deriveBudgetName(uiType, periodStart, periodEnd);
  const name = uiType === 'project' ? projectName.trim() : derivedName;
  const canCreate = !isCreating && name.length > 0;

  async function handleCreate() {
    if (!canCreate) return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createBudget({
        name,
        type: uiType === 'project' ? 'project' : 'period',
        household_id: householdId,
        period_start: uiType === 'project' ? undefined : periodStart,
        period_end: uiType === 'project' ? undefined : periodEnd,
      });
      reset();
      onCreate(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create budget.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>New budget</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <BudgetTypeField value={uiType} onChange={setUiType} disabled={isCreating} />

        {uiType === 'monthly' && (
          <MonthlyPeriodField
            periodStart={periodStart}
            onChange={(start, end) => {
              setPeriodStart(start);
              setPeriodEnd(end);
            }}
            disabled={isCreating}
          />
        )}

        {uiType === 'period' && (
          <PeriodRangeFields
            periodStart={periodStart}
            periodEnd={periodEnd}
            onChangeStart={setPeriodStart}
            onChangeEnd={setPeriodEnd}
            disabled={isCreating}
          />
        )}

        {uiType === 'project' && (
          <ProjectNameField
            value={projectName}
            onChange={setProjectName}
            onSubmit={handleCreate}
            disabled={isCreating}
          />
        )}

        {uiType !== 'project' && derivedName && (
          <Typography variant="body2" color="text.secondary">
            Will be named &quot;{derivedName}&quot;
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate}
          startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : null}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
