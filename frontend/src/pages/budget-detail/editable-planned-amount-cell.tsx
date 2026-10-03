// pages/budget-detail/editable-planned-amount-cell.tsx
//
// Inline-editable planned amount, spreadsheet-style: type a new value, blur
// or Enter to save. Local input state resyncs when the value prop changes
// externally (e.g. after a successful save returns the canonical value),
// mirroring the "compare prev vs. current prop" pattern already used in
// TransactionLabelCell for the same local-edit-state-vs-prop-drift problem.

import { InputBase } from '@mui/material';
import { useState } from 'react';

interface EditablePlannedAmountCellProps {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}

export function EditablePlannedAmountCell({
  value,
  disabled = false,
  onSave,
}: EditablePlannedAmountCellProps) {
  const [inputValue, setInputValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
  }

  function commit() {
    const trimmed = inputValue.trim();
    if (trimmed === '' || Number.isNaN(Number(trimmed))) {
      setInputValue(value);
      return;
    }
    const normalized = Number(trimmed).toFixed(2);
    if (Number(normalized) === Number(value)) {
      setInputValue(normalized);
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
        inputMode: 'decimal',
        'aria-label': 'Planned amount',
        style: { textAlign: 'right' },
      }}
      sx={{ width: 90, fontSize: '0.875rem' }}
    />
  );
}
