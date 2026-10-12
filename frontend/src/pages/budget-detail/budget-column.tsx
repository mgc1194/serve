// pages/budget-detail/budget-column.tsx — One section (Earnings or
// Spending) of the budget detail page's planned-vs-actual view: a header
// naming the section, and a table of its BudgetLines (Category, Budgeted,
// Total, Diff), one row per line via BudgetLineRow.
//
// Purely presentational — takes whatever lines it's given as-is. Which
// lines belong to this column (by category_type) is the caller's job, not
// this component's, so it stays reusable for either section without an
// "earning" | "spending" prop of its own.

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { BudgetLineRow } from '@pages/budget-detail/budget-line-row';
import type { BudgetLine } from '@serve/types/global';

const HEADER_CELL_SX = { fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' } as const;

interface BudgetColumnProps {
  title: string;
  lines: BudgetLine[];
  emptyMessage?: string;
}

export function BudgetColumn({ title, lines, emptyMessage = 'No categories yet.' }: BudgetColumnProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title}
      </Typography>

      {lines.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={HEADER_CELL_SX}>Category</TableCell>
                <TableCell align="right" sx={HEADER_CELL_SX}>
                  Budgeted
                </TableCell>
                <TableCell align="right" sx={HEADER_CELL_SX}>
                  Total
                </TableCell>
                <TableCell align="right" sx={HEADER_CELL_SX}>
                  Diff
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map(line => (
                <BudgetLineRow key={line.id} line={line} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
