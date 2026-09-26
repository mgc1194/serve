// pages/budgets/create-budget-dialog/project-name-field.tsx

import { TextField } from '@mui/material';
import type { KeyboardEvent } from 'react';

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
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // isComposing guards against an IME's confirmation Enter (e.g.
    // finalizing Japanese/Chinese input) submitting instead of just
    // closing the composition; preventDefault stops the browser's own
    // implicit form-submit behavior for an Enter inside a text input.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    onSubmit();
  }

  return (
    <TextField
      label="Name"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      size="small"
      disabled={disabled}
    />
  );
}
