// pages/summary/summary-section.tsx — Earnings/Spending tab panel with category table.

import {
  Box,
  Divider,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';

import type { CategorySummary, Summary } from '@serve/types/global';

// ── Helpers ───────────────────────────────────────────────────────────────────

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'never',
  }).format(Math.abs(value));
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

interface CategoryRowProps {
  row: CategorySummary;
}

function CategoryRow({ row }: CategoryRowProps) {
  const categoryLabel = row.category || 'Uncategorised';

  return (
    <>
      <TableRow
        sx={{
          bgcolor: 'primary.main',
          '& td': { color: 'primary.contrastText', fontWeight: 600, py: 0.75 },
        }}
      >
        <TableCell>{categoryLabel}</TableCell>
        <TableCell align="right">{currency(row.total)}</TableCell>
      </TableRow>

      {row.labels.map(label => (
        <TableRow key={label.label_id} hover>
          <TableCell sx={{ pl: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: label.label_color,
                  flexShrink: 0,
                }}
              />
              {label.label_name}
            </Box>
          </TableCell>
          <TableCell align="right" sx={{ color: 'text.secondary' }}>
            {currency(label.total)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── CategoryTable ─────────────────────────────────────────────────────────────

interface CategoryTableProps {
  categories: CategorySummary[];
  emptyMessage: string;
}

function CategoryTable({ categories, emptyMessage }: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>
              Labels
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}
            >
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(cat => (
            <CategoryRow key={cat.category} row={cat} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── SummarySection ────────────────────────────────────────────────────────────

interface SummarySectionProps {
  summary: Summary;
  activeTab: 'spending' | 'earnings';
  onTabChange: (tab: 'spending' | 'earnings') => void;
  monthLabel: string;
}

export function SummarySection({
  summary,
  activeTab,
  onTabChange,
  monthLabel,
}: SummarySectionProps) {
  return (
    <>
      <Tabs
        value={activeTab}
        onChange={(_e, val: 'spending' | 'earnings') => onTabChange(val)}
        sx={{ mb: 2 }}
      >
        <Tab label="Spending" value="spending" />
        <Tab label="Earnings" value="earnings" />
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {activeTab === 'spending' && (
        <CategoryTable
          categories={summary.spending}
          emptyMessage={`No spending transactions for ${monthLabel}.`}
        />
      )}
      {activeTab === 'earnings' && (
        <CategoryTable
          categories={summary.earnings}
          emptyMessage={`No earnings transactions for ${monthLabel}.`}
        />
      )}
    </>
  );
}
