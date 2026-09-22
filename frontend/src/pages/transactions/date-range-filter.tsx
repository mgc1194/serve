// pages/transactions/date-range-filter.tsx — Date range filter for the
// transactions table.
//
// Plain native <input type="date"> (via MUI TextField) rather than pulling
// in a date-picker library for two fields — no date library is installed in
// this project yet. Each field's min/max is clamped to the other's current
// value so the browser's own picker discourages an inverted range; the
// backend still validates and rejects one if it happens anyway (e.g. typed
// directly rather than picked).

import { Box, TextField } from '@mui/material';

interface DateRangeFilterProps {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        type="date"
        label="From"
        size="small"
        value={dateFrom ?? ''}
        onChange={e => onDateFromChange(e.target.value || undefined)}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { max: dateTo },
        }}
        sx={{ width: 170 }}
      />
      <TextField
        type="date"
        label="To"
        size="small"
        value={dateTo ?? ''}
        onChange={e => onDateToChange(e.target.value || undefined)}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { min: dateFrom },
        }}
        sx={{ width: 170 }}
      />
    </Box>
  );
}
