// pages/budget-detail/budget-section.tsx
//
// One Income or Expenses section: a Planned/Actual summary, then a table
// with Planned/Actual/Diff. columns — a bold Totals row followed by one row
// per tracked category. Diff is a pure display derivation: extra income
// (actual > planned) or unspent budget (planned > actual) both count as a
// positive ("good") diff, so the sign convention flips between the two
// sections — not sent by the backend.

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import { EditablePlannedAmountCell } from '@pages/budget-detail/editable-planned-amount-cell';
import type { BudgetLine } from '@serve/types/global';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

function DiffCell({ diff }: { diff: number }) {
  const isGood = diff >= 0;
  return (
    <TableCell align="right">
      <Typography
        component="span"
        variant="body2"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          color: isGood ? 'success.main' : 'error.main',
          fontWeight: 500,
        }}
      >
        {isGood ? '+' : '−'}
        {formatMoney(Math.abs(diff))}
      </Typography>
    </TableCell>
  );
}

interface BudgetSectionProps {
  title: string;
  lines: BudgetLine[];
  isIncome: boolean;
  onPlannedAmountChange: (lineId: number, value: string) => void;
  onRemove: (lineId: number) => void;
}

export function BudgetSection({
  title,
  lines,
  isIncome,
  onPlannedAmountChange,
  onRemove,
}: BudgetSectionProps) {
  const plannedTotal = lines.reduce((sum, l) => sum + Number(l.planned_amount), 0);
  const actualTotal = lines.reduce((sum, l) => sum + Number(l.actual_amount), 0);
  const totalsDiff = isIncome ? actualTotal - plannedTotal : plannedTotal - actualTotal;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Planned <strong>{formatMoney(plannedTotal)}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Actual <strong>{formatMoney(actualTotal)}</strong>
        </Typography>
      </Box>

      {lines.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          No categories tracked yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right">Planned</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell align="right">Diff.</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Totals</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatMoney(plannedTotal)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatMoney(actualTotal)}
              </TableCell>
              <DiffCell diff={totalsDiff} />
              <TableCell />
            </TableRow>
            {lines.map(line => {
              const planned = Number(line.planned_amount);
              const actual = Number(line.actual_amount);
              const diff = isIncome ? actual - planned : planned - actual;
              return (
                <TableRow key={line.id}>
                  <TableCell>{line.category_name}</TableCell>
                  <TableCell align="right">
                    <EditablePlannedAmountCell
                      value={line.planned_amount}
                      onSave={value => onPlannedAmountChange(line.id, value)}
                    />
                  </TableCell>
                  <TableCell align="right">{formatMoney(actual)}</TableCell>
                  <DiffCell diff={diff} />
                  <TableCell align="right">
                    <Tooltip title={`Remove ${line.category_name}`}>
                      <IconButton
                        size="small"
                        aria-label={`Remove ${line.category_name}`}
                        onClick={() => onRemove(line.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
