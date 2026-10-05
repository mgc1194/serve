// pages/budget-detail/editable-planned-amount-cell.tsx
//
// Inline-editable planned amount, spreadsheet-style: type a new value, blur
// or Enter to save. Whole dollars only — cents aren't meaningful for a
// planning target, so a typed fractional value is rounded to the nearest
// dollar rather than rejected. Local input state resyncs when the value
// prop changes externally (e.g. after a successful save returns the
// canonical value), mirroring the "compare prev vs. current prop" pattern
// already used in TransactionLabelCell for the same
// local-edit-state-vs-prop-drift problem.

import { InputBase } from '@mui/material';
import { useState } from 'react';

interface EditablePlannedAmountCellProps {
  value: number;
  disabled?: boolean;
  onSave: (value: number) => void;
}

export function EditablePlannedAmountCell({
  value,
  disabled = false,
  onSave,
}: EditablePlannedAmountCellProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(String(value));
  }

  function commit() {
    const trimmed = inputValue.trim();
    if (trimmed === '' || Number.isNaN(Number(trimmed))) {
      setInputValue(String(value));
      return;
    }
    const normalized = Math.round(Number(trimmed));
    if (normalized === value) {
      setInputValue(String(normalized));
      return;
    }
    onSave(normalized);
  }

  return (
    <InputBase
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      disabled={disabled}
      inputProps={{
        inputMode: 'numeric',
        'aria-label': 'Planned amount',
        style: { textAlign: 'right' },
      }}
      sx={{ width: 90, fontSize: '0.875rem' }}
    />
  );
}
