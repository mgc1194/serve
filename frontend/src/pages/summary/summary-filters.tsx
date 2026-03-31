// pages/summary/summary-filters.tsx — Household, year, and month pickers.

import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { MONTH_NAMES } from '@pages/summary/date-utils';
import type { Household } from '@serve/types/global';


interface SummaryFiltersProps {
  households: Household[];
  householdId: number | undefined;
  selectedYear: number;
  selectedMonth: number;
  years: number[];
  availableMonths: number[];
  onHouseholdChange: (id: number) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export function SummaryFilters({
  households,
  householdId,
  selectedYear,
  selectedMonth,
  years,
  availableMonths,
  onHouseholdChange,
  onYearChange,
  onMonthChange,
}: SummaryFiltersProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      {households.length > 1 && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Household</InputLabel>
          <Select
            value={householdId ?? ''}
            label="Household"
            onChange={e => onHouseholdChange(Number(e.target.value))}
          >
            {households.map(h => (
              <MenuItem key={h.id} value={h.id}>
                {h.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>Year</InputLabel>
        <Select
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
        <InputLabel>Month</InputLabel>
        <Select
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
