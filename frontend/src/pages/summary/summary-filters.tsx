// pages/summary/summary-filters.tsx — Year and month pickers.
//
// Household is chosen session-wide via SwitchHouseholdButton, rendered
// alongside this component by SummaryPage.

import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { MONTH_NAMES } from '@pages/summary/date-utils';

interface SummaryFiltersProps {
  selectedYear: number;
  selectedMonth: number;
  years: number[];
  availableMonths: number[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export function SummaryFilters({
  selectedYear,
  selectedMonth,
  years,
  availableMonths,
  onYearChange,
  onMonthChange,
}: SummaryFiltersProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel id="summary-year-label">Year</InputLabel>
        <Select
          labelId="summary-year-label"
          id="summary-year-select"
          value={selectedYear}
          label="Year"
          onChange={e => onYearChange(Number(e.target.value))}
        >
          {years.map(y => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="summary-month-label">Month</InputLabel>
        <Select
          labelId="summary-month-label"
          id="summary-month-select"
          value={selectedMonth}
          label="Month"
          onChange={e => onMonthChange(Number(e.target.value))}
        >
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            return (
              <MenuItem key={m} value={m} disabled={!availableMonths.includes(m)}>
                {name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
}
