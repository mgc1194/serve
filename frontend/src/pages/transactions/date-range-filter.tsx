// pages/transactions/date-range-filter.tsx — Date range filter for the
// transactions table.
//
// Two independent MUI DatePickers rather than a single linked range
// control — MUI's DateRangePicker lives in the paid @mui/x-date-pickers-pro
// package, and a linked range isn't worth that cost for two fields. Each
// field's min/max is clamped to the other's current value so picking an
// inverted range isn't possible through the calendar; the backend still
// validates and rejects one if it happens anyway (e.g. typed directly).
// The component's own props stay plain "YYYY-MM-DD" strings — the only
// shape both the backend's date param and the rest of TransactionsPage's
// URL-driven state understand — with dayjs conversion kept internal.

import { Box } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { type Dayjs } from 'dayjs';

const DATE_FORMAT = 'YYYY-MM-DD';

function toDayjs(value: string | undefined): Dayjs | null {
  return value ? dayjs(value, DATE_FORMAT, true) : null;
}

function toDateString(value: Dayjs | null): string | undefined {
  return value?.isValid() ? value.format(DATE_FORMAT) : undefined;
}

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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <DatePicker
          label="From"
          format={DATE_FORMAT}
          value={toDayjs(dateFrom)}
          onChange={value => onDateFromChange(toDateString(value))}
          maxDate={toDayjs(dateTo) ?? undefined}
          slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
        />
        <DatePicker
          label="To"
          format={DATE_FORMAT}
          value={toDayjs(dateTo)}
          onChange={value => onDateToChange(toDateString(value))}
          minDate={toDayjs(dateFrom) ?? undefined}
          slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
        />
      </Box>
    </LocalizationProvider>
  );
}
