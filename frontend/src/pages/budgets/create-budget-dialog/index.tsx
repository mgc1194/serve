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
//
// copyFromBudget turns this into "Duplicate": the type/dates/project-name
// defaults shift to the source's next period (see deriveDuplicateDefaults),
// and submitting also copies that budget's lines (category, planned_amount,
// notes) onto the new one server-side — the form itself doesn't fetch or
// show those lines, since the only thing being edited here is the new
// budget's own shape.

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
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import { BudgetTypeField } from '@pages/budgets/create-budget-dialog/budget-type-field';
import { MonthlyPeriodField } from '@pages/budgets/create-budget-dialog/monthly-period-field';
import { PeriodRangeFields } from '@pages/budgets/create-budget-dialog/period-range-fields';
import { ProjectNameField } from '@pages/budgets/create-budget-dialog/project-name-field';
import type { UiBudgetType } from '@pages/budgets/create-budget-dialog/types';
import type { Budget } from '@serve/types/global';
import { createBudget, ApiError } from '@services/budgets';

const DATE_FORMAT = 'YYYY-MM-DD';

// Mirrors Budget.name's max_length (backend/budgets/models.py) — the
// duplicate-project default below must respect it too, not just manual
// typing: a source name already near the limit would otherwise overflow
// once " copy" is appended, and canCreate only checks non-emptiness, so
// that overflowing default would submit as-is and the backend would
// reject it.
const NAME_MAX_LENGTH = 100;

/**
 * "August 2026" for Monthly, "Aug 15, 2026 – Sep 15, 2026" for Period —
 * both derived purely from the picked dates. A name only makes sense for a
 * Project once the household types one in, so this returns '' for it.
 */
function deriveBudgetName(uiType: UiBudgetType, periodStart?: string, periodEnd?: string): string {
  if (uiType === 'monthly' && periodStart) {
    const start = dayjs(periodStart, DATE_FORMAT, true);
    return start.isValid() ? start.format('MMMM YYYY') : '';
  }
  if (uiType === 'period' && periodStart && periodEnd) {
    const start = dayjs(periodStart, DATE_FORMAT, true);
    const end = dayjs(periodEnd, DATE_FORMAT, true);
    // The pickers' min/max props only constrain the calendar UI — typing a
    // date directly can still produce a reversed range, so re-check it here,
    // the one place both ends of the range are read before Create is enabled.
    if (!start.isValid() || !end.isValid() || start.isAfter(end)) return '';
    return `${start.format('MMM D, YYYY')} – ${end.format('MMM D, YYYY')}`;
  }
  return '';
}

interface DuplicateDefaults {
  uiType: UiBudgetType;
  periodStart?: string;
  periodEnd?: string;
  projectName?: string;
}

/**
 * Defaults for "duplicate this budget": same shape, shifted to the next
 * period immediately following the source's — a whole-calendar-month
 * source (start on the 1st, end on that month's last day) advances by a
 * calendar month so the picker shows e.g. "September 2026" rather than a
 * 30-ish-day window starting mid-month; any other period range (including
 * one that merely happens to span a whole month some other way) just
 * slides forward by its own length instead, which generalizes to a
 * source that was never month-aligned to begin with. A project has no
 * period to shift, only a name that can't be reused verbatim (budget
 * names are unique per household) — offered as a starting point to edit,
 * not a value the user has to type from scratch.
 */
function deriveDuplicateDefaults(source: Budget): DuplicateDefaults {
  if (source.type === 'project') {
    const suffix = ' copy';
    const truncatedName = source.name.slice(0, NAME_MAX_LENGTH - suffix.length);
    return { uiType: 'project', projectName: `${truncatedName}${suffix}` };
  }

  const start = source.period_start ? dayjs(source.period_start, DATE_FORMAT, true) : null;
  const end = source.period_end ? dayjs(source.period_end, DATE_FORMAT, true) : null;
  if (!start?.isValid() || !end?.isValid()) return { uiType: 'period' };

  const isWholeCalendarMonth = start.date() === 1 && end.isSame(start.endOf('month'), 'day');
  if (isWholeCalendarMonth) {
    const nextMonth = start.add(1, 'month');
    return {
      uiType: 'monthly',
      periodStart: nextMonth.startOf('month').format(DATE_FORMAT),
      periodEnd: nextMonth.endOf('month').format(DATE_FORMAT),
    };
  }

  const durationDays = end.diff(start, 'day');
  const nextStart = end.add(1, 'day');
  return {
    uiType: 'period',
    periodStart: nextStart.format(DATE_FORMAT),
    periodEnd: nextStart.add(durationDays, 'day').format(DATE_FORMAT),
  };
}

interface CreateBudgetDialogProps {
  open: boolean;
  householdId: number;
  // When set, prefills the dialog to duplicate this budget's lines
  // (category, planned_amount, notes) into the new one — see
  // deriveDuplicateDefaults for how its type/dates seed the form.
  copyFromBudget?: Budget | null;
  onClose: () => void;
  onCreate: (budget: Budget) => void;
}

export function CreateBudgetDialog({
  open,
  householdId,
  copyFromBudget,
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
    const defaults = copyFromBudget ? deriveDuplicateDefaults(copyFromBudget) : { uiType: 'monthly' as const };
    setUiType(defaults.uiType);
    setPeriodStart(defaults.periodStart);
    setPeriodEnd(defaults.periodEnd);
    setProjectName(defaults.projectName ?? '');
    setError(null);
  }

  // Re-derives the form's defaults whenever the dialog opens, or while
  // already open the parent swaps in a different source budget to copy
  // (clicking "Duplicate" on another card without this one having closed
  // in between) — handleClose/handleCreate's own reset() only covers the
  // next *open*, not a mid-session source change.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, copyFromBudget]);

  function handleClose() {
    if (isCreating) return;
    reset();
    onClose();
  }

  function handleTypeChange(newType: UiBudgetType) {
    setUiType(newType);
    // A custom Period range isn't a valid Monthly selection (its bounds
    // needn't span a whole month) and vice versa, so carrying it across a
    // type switch could derive a name that doesn't match what gets sent —
    // e.g. "August 2026" while still submitting a leftover Sep 15 end date.
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
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
        copy_lines_from_budget_id: copyFromBudget?.id,
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
      <DialogTitle sx={{ pb: 2 }}>
        {copyFromBudget ? `Duplicate "${copyFromBudget.name}"` : 'New budget'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {copyFromBudget && (
          <Alert severity="info">
            Categories and planned amounts will be copied from &quot;{copyFromBudget.name}
            &quot; — edit any amounts afterward.
          </Alert>
        )}

        <BudgetTypeField value={uiType} onChange={handleTypeChange} disabled={isCreating} />

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
          {copyFromBudget ? 'Duplicate' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
