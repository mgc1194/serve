// pages/budgets/create-budget-dialog/period-range-fields.tsx

import { Box } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { DATE_FORMAT, toDateString, toDayjs } from '@pages/budgets/create-budget-dialog/date-helpers';

interface PeriodRangeFieldsProps {
  periodStart: string | undefined;
  periodEnd: string | undefined;
  onChangeStart: (value: string | undefined) => void;
  onChangeEnd: (value: string | undefined) => void;
  disabled?: boolean;
}

export function PeriodRangeFields({
  periodStart,
  periodEnd,
  onChangeStart,
  onChangeEnd,
  disabled = false,
}: PeriodRangeFieldsProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <DatePicker
          label="From"
          format={DATE_FORMAT}
          value={toDayjs(periodStart)}
          onChange={value => onChangeStart(toDateString(value))}
          disabled={disabled}
          maxDate={toDayjs(periodEnd) ?? undefined}
          sx={{ flex: 1 }}
        />
        <DatePicker
          label="To"
          format={DATE_FORMAT}
          value={toDayjs(periodEnd)}
          onChange={value => onChangeEnd(toDateString(value))}
          disabled={disabled}
          minDate={toDayjs(periodStart) ?? undefined}
          sx={{ flex: 1 }}
        />
      </Box>
    </LocalizationProvider>
  );
}
