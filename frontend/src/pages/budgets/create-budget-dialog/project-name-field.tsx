// pages/budgets/create-budget-dialog/project-name-field.tsx

import { TextField } from '@mui/material';

interface ProjectNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ProjectNameField({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: ProjectNameFieldProps) {
  return (
    <TextField
      label="Name"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit()}
      size="small"
      disabled={disabled}
    />
  );
}
