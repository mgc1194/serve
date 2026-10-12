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
import { formatCurrency, signPrefix } from '@utils/currency';

// ── CategoryRow ───────────────────────────────────────────────────────────────

interface CategoryRowProps {
  row: CategorySummary;
}

function CategoryRow({ row }: CategoryRowProps) {
  const categoryLabel = row.category_name || 'Uncategorised';

  return (
    <>
      <TableRow
        sx={{
          bgcolor: 'primary.main',
          '& td': { color: 'primary.contrastText', fontWeight: 600, py: 0.75 },
        }}
      >
        <TableCell>{categoryLabel}</TableCell>
        {/* A category's total follows its own type (see
            api/v1/summary.py::get_summary) — a spending category can still
            net positive (a refund, a deposit) and vice versa, so its sign
            here must reflect the actual total, not just "every row under
            Spending is a cost". */}
        <TableCell align="right">
          {signPrefix(row.total)}{formatCurrency(row.total)}
        </TableCell>
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
            {signPrefix(label.total)}{formatCurrency(label.total)}
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
            <CategoryRow key={cat.category_id ?? 'uncategorised'} row={cat} />
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
