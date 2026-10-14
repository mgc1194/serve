// pages/budget-detail/budget-line-row.tsx — A single category row within a
// BudgetColumn: category name, budgeted (planned) amount, actual total,
// and the difference between them. In edit mode, the budgeted amount
// becomes an editable field and a delete action appears — see
// BudgetDetailPage's own edit-mode state for how an edit here is staged
// (not saved) until "Confirm changes".
//
// "Positive is good" in both directions for Diff: for an earning category,
// actual - planned (earned more than planned); for a spending category,
// planned - actual (spent less than planned — came in under budget).
// category_type (not which column the row happens to render in) decides
// which direction applies, so the row is correct even if a caller ever
// passes it a line that doesn't match its column's own type.

import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton, TableCell, TableRow, TextField, Typography } from '@mui/material';

import type { BudgetLine } from '@serve/types/global';
import { formatCurrency, signPrefix } from '@utils/currency';

interface BudgetLineRowProps {
  line: BudgetLine;
  isEditMode?: boolean;
  // The budgeted TextField's raw text while isEditMode — distinct from
  // line.planned_amount, which the caller has already resolved to a
  // display-safe number (falling back to the last-committed value while
  // this is invalid or empty). Showing the raw text here — not that
  // fallback — is what lets the field go through an empty or
  // momentarily-invalid state while typing, rather than snapping back on
  // every non-digit keystroke.
  plannedAmountInput?: string;
  onPlannedAmountChange?: (lineId: number, value: string) => void;
  onDelete?: (lineId: number) => void;
  // Disables the input and delete button without hiding them — used
  // while a previous batch of edits is still being confirmed, so a
  // second round can't start stacking on top of one already in flight.
  disabled?: boolean;
}

export function BudgetLineRow({
  line,
  isEditMode = false,
  plannedAmountInput,
  onPlannedAmountChange,
  onDelete,
  disabled = false,
}: BudgetLineRowProps) {
  const actual = Number(line.actual_amount);
  const planned = line.planned_amount;
  const diff = line.category_type === 'earning' ? actual - planned : planned - actual;
  // Same whole-dollar-digits rule create-budget-line-dialog enforces for
  // a new line's amount, applied here to an edit of an existing one too.
  const isAmountInvalid = isEditMode && !/^\d+$/.test(plannedAmountInput ?? '');

  return (
    <TableRow hover>
      <TableCell>{line.category_name}</TableCell>
      {/* whiteSpace: 'nowrap' — a large amount (five digits and up) could
          otherwise wrap onto a second line within the cell once the
          category name on the same row pushes these columns narrow. The
          table's own TableContainer already scrolls horizontally if a row
          genuinely doesn't fit, which reads better than a broken amount. */}
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {isEditMode ? (
          <TextField
            type="number"
            size="small"
            value={plannedAmountInput ?? ''}
            onChange={e => onPlannedAmountChange?.(line.id, e.target.value)}
            error={isAmountInvalid}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 0, step: 1, 'aria-label': `${line.category_name} budgeted amount` } }}
            sx={{ width: 110 }}
          />
        ) : (
          formatCurrency(planned)
        )}
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
      {isEditMode && (
        <TableCell align="right">
          <IconButton
            size="small"
            onClick={() => onDelete?.(line.id)}
            disabled={disabled}
            aria-label={`Delete ${line.category_name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );
}
