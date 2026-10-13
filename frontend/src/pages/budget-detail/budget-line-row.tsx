// pages/budget-detail/budget-line-row.tsx — A single category row within a
// BudgetColumn: category name, budgeted (planned) amount, actual total,
// and the difference between them.
//
// "Positive is good" in both directions for Diff: for an earning category,
// actual - planned (earned more than planned); for a spending category,
// planned - actual (spent less than planned — came in under budget).
// category_type (not which column the row happens to render in) decides
// which direction applies, so the row is correct even if a caller ever
// passes it a line that doesn't match its column's own type.

import { TableCell, TableRow, Typography } from '@mui/material';

import type { BudgetLine } from '@serve/types/global';
import { formatCurrency, signPrefix } from '@utils/currency';

interface BudgetLineRowProps {
  line: BudgetLine;
}

export function BudgetLineRow({ line }: BudgetLineRowProps) {
  const actual = Number(line.actual_amount);
  const planned = line.planned_amount;
  const diff = line.category_type === 'earning' ? actual - planned : planned - actual;

  return (
    <TableRow hover>
      <TableCell>{line.category_name}</TableCell>
      {/* whiteSpace: 'nowrap' — a large amount (five digits and up) could
          otherwise wrap onto a second line within the cell once the
          category name on the same row pushes these columns narrow. The
          table's own TableContainer already scrolls horizontally if a row
          genuinely doesn't fit, which reads better than a broken amount. */}
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {formatCurrency(planned)}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {formatCurrency(actual)}
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Typography component="span" color={diff >= 0 ? 'success.main' : 'error.main'}>
          {signPrefix(diff)}
          {formatCurrency(diff)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}
