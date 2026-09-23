// pages/budgets/create-budget-dialog/period-range-fields.tsx

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
