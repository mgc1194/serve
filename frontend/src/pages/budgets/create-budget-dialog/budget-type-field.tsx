// pages/budgets/create-budget-dialog/budget-type-field.tsx

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import type { UiBudgetType } from '@pages/budgets/create-budget-dialog/types';

interface BudgetTypeFieldProps {
  value: UiBudgetType;
  onChange: (value: UiBudgetType) => void;
  disabled?: boolean;
}

export function BudgetTypeField({ value, onChange, disabled = false }: BudgetTypeFieldProps) {
  function handleChange(event: SelectChangeEvent) {
    onChange(event.target.value as UiBudgetType);
  }

  return (
    // mt, not the surrounding DialogContent's pt: MUI zeroes a DialogContent's
    // own padding-top when it follows a DialogTitle, via a rule the `sx`
    // prop can't outweigh — which otherwise crops this field's shrunk label.
    <FormControl size="small" disabled={disabled} sx={{ mt: 1 }}>
      <InputLabel id="budget-type-label">Type</InputLabel>
      <Select labelId="budget-type-label" label="Type" value={value} onChange={handleChange}>
        <MenuItem value="monthly">Monthly</MenuItem>
        <MenuItem value="period">Period</MenuItem>
        <MenuItem value="project">Project</MenuItem>
      </Select>
    </FormControl>
  );
}
