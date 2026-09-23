// pages/budgets/create-budget-dialog/monthly-period-field.tsx

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { type Dayjs } from 'dayjs';

const DATE_FORMAT = 'YYYY-MM-DD';
const MONTH_FORMAT = 'YYYY-MM';

interface MonthlyPeriodFieldProps {
  periodStart: string | undefined;
  onChange: (periodStart: string | undefined, periodEnd: string | undefined) => void;
  disabled?: boolean;
}

export function MonthlyPeriodField({
  periodStart,
  onChange,
  disabled = false,
}: MonthlyPeriodFieldProps) {
  function handleChange(value: Dayjs | null) {
    if (!value?.isValid()) {
      onChange(undefined, undefined);
      return;
    }
    onChange(value.startOf('month').format(DATE_FORMAT), value.endOf('month').format(DATE_FORMAT));
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Month"
        views={['year', 'month']}
        openTo="month"
        format={MONTH_FORMAT}
        value={periodStart ? dayjs(periodStart, DATE_FORMAT, true) : null}
        onChange={handleChange}
        disabled={disabled}
      />
    </LocalizationProvider>
  );
}
