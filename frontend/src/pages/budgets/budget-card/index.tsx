// pages/budgets/budget-card/index.tsx — Read-only card for a single budget
// in the Budgets list. Renaming, deactivating, and the full income/expenses
// detail view land in follow-up PRs, once their endpoints exist.

import { Box, Chip, Paper, Typography } from '@mui/material';

import type { Budget } from '@serve/types/global';

const TYPE_LABELS: Record<Budget['type'], string> = {
  period: 'Period',
  project: 'Project',
};

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${budget.period_start} – ${budget.period_end}`;
}

interface BudgetCardProps {
  budget: Budget;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const period = formatPeriod(budget);

  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, px: 3, py: 2.5 }}>
      <Typography
        variant="h6"
        component="h4"
        sx={{ fontFamily: '"DM Serif Display", Georgia, serif', mb: 1 }}
      >
        {budget.name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label={TYPE_LABELS[budget.type]} size="small" sx={{ fontWeight: 500 }} />
        {period && (
          <Typography variant="body2" color="text.secondary">
            {period}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
