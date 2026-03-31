// pages/summary/summary-totals-bar.tsx — Earnings, spending, and balance totals.

import { Box, Typography } from '@mui/material';

import type { Summary } from '@serve/types/global';

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'never',
  }).format(Math.abs(value));
}

interface TotalItemProps {
  label: string;
  value: number;
  color?: string;
  prefix?: string;
}

function TotalItem({ label, value, color, prefix }: TotalItemProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} color={color}>
        {prefix}{currency(value)}
      </Typography>
    </Box>
  );
}

interface SummaryTotalsBarProps {
  summary: Summary;
}

export function SummaryTotalsBar({ summary }: SummaryTotalsBarProps) {
  // Derive totals from the category rows so they always match what's displayed.
  const totalEarnings = summary.earnings.reduce((sum, cat) => sum + cat.total, 0);
  const totalSpending = summary.spending.reduce((sum, cat) => sum + cat.total, 0);
  const balance = summary.balance;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 4,
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        flexWrap: 'wrap',
      }}
    >
      <TotalItem
        label="Earnings"
        value={totalEarnings}
        color="success.main"
        prefix="+"
      />
      <TotalItem
        label="Spending"
        value={totalSpending}
        color="error.main"
        prefix="−"
      />
      <TotalItem
        label="Balance"
        value={balance}
        color={balance >= 0 ? 'success.main' : 'error.main'}
        prefix={balance >= 0 ? '+' : '−'}
      />
      {summary.uncategorised_total !== 0 && (
        <TotalItem
          label="Unlabelled"
          value={summary.uncategorised_total}
          color="text.secondary"
        />
      )}
    </Box>
  );
}
