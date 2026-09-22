// pages/transactions/budget-filter-bar.tsx — Budget selector for the
// transactions table.
//
// A searchable single-select mirroring label-filter-bar.tsx's shape. No
// "unassigned"-style sentinel is needed — MUI's built-in clear button
// already handles "no budget selected". Selecting a budget doesn't filter
// which transactions are shown; it scopes the table's "Budget category"
// column (rendered by TransactionsTable) to that budget's tracked
// categories.

import { Autocomplete, TextField } from '@mui/material';

import type { Budget } from '@serve/types/global';

interface BudgetFilterBarProps {
  budgets: Budget[];
  budgetId: number | undefined;
  onBudgetChange: (id: number | undefined) => void;
}

export function BudgetFilterBar({ budgets, budgetId, onBudgetChange }: BudgetFilterBarProps) {
  const selected = budgets.find(b => b.id === budgetId) ?? null;

  return (
    <Autocomplete
      value={selected}
      onChange={(_event, value) => onBudgetChange(value?.id)}
      options={budgets}
      getOptionLabel={b => b.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      size="small"
      sx={{ width: 220 }}
      renderInput={params => <TextField {...params} label="Budget" placeholder="No budget" />}
    />
  );
}
