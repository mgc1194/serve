// pages/budget-detail/budget-progress-bar.tsx — A BudgetColumn's total
// actual vs. total planned, as a labeled progress bar. `type` exists only
// so the bar's color can apply the same "positive is good" convention
// BudgetLineRow's own per-line Diff already uses: exceeding an earning
// goal is good, exceeding a spending budget isn't — the inverse of
// each other.

import { Box, LinearProgress, Typography } from '@mui/material';

import { formatCurrency } from '@utils/currency';

interface BudgetProgressBarProps {
  type: 'earning' | 'spending';
  totalPlanned: number;
  totalActual: number;
}

export function BudgetProgressBar({ type, totalPlanned, totalActual }: BudgetProgressBarProps) {
  const totalDiff = type === 'earning' ? totalActual - totalPlanned : totalPlanned - totalActual;
  // Capped at 100 — the bar shows how much of the goal/budget has been
  // reached, not how far past it actual has gone; the color below is
  // what signals over/under, and the dollar labels show the true figures.
  const progressValue = totalPlanned > 0 ? Math.min(100, (totalActual / totalPlanned) * 100) : 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(totalActual)} actual
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(totalPlanned)} planned
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progressValue}
        color={totalDiff >= 0 ? 'success' : 'error'}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
}
