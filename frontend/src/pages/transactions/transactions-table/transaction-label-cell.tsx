// pages/transactions/transactions-table/transaction-label-cell.tsx —
// Label autocomplete with optimistic updates. Immediately reflects the
// selected label as a colored chip and reverts on API failure.

import { Autocomplete, Box, Chip, TableCell, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

import {
  autocompleteSx,
  getSelectedLabelInputSx,
  noLabelInputSx,
} from '@pages/transactions/transactions-table/transaction-label-cell.styles';
import type { Label, Transaction } from '@serve/types/global';
import { ApiError, updateTransactionLabel } from '@services/transactions';
import { contrastTextColor } from '@utils/contrast-text-color';


interface TransactionLabelCellProps {
  transaction: Transaction;
  labels: Label[];
  onUpdated: (transaction: Transaction) => void;
  onError: (message: string | null) => void;
}

// Sentinel option rendered at the top of the list to allow clearing the label.
const NO_LABEL: Label = {
  id: -1,
  name: 'No label',
  color: '',
  category: '',
  household_id: -1,
};

export function TransactionLabelCell({
  transaction,
  labels,
  onUpdated,
  onError,
}: TransactionLabelCellProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedLabel = labels.find(lbl => lbl.id === transaction.label_id) ?? undefined;
  const options = [NO_LABEL, ...labels];

  const [inputValue, setInputValue] = useState(selectedLabel?.name ?? '');
  useEffect(() => {
    setInputValue(selectedLabel?.name ?? '');
  }, [selectedLabel?.name]);

  async function handleChange(
    _event: React.SyntheticEvent,
    selected: Label | null | undefined,
  ) {
    const isClearing = selected == null || selected.id === NO_LABEL.id;
    const newLabelId = isClearing ? null : selected!.id;

    const optimistic: Transaction = {
      ...transaction,
      label_id: newLabelId,
      label_name: isClearing ? null : selected!.name,
      label_color: isClearing ? null : selected!.color,
    };
    onUpdated(optimistic);
    setIsUpdating(true);
    onError(null);

    try {
      const updated = await updateTransactionLabel(transaction.id, newLabelId);
      onUpdated(updated);
    } catch (err) {
      onUpdated(transaction);
      onError(err instanceof ApiError ? err.message : 'Could not update label.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <TableCell sx={{ py: 1.5 }}>
      <Autocomplete
        value={selectedLabel}
        inputValue={inputValue}
        onInputChange={(_event, newValue) => setInputValue(newValue)}
        options={options}
        getOptionLabel={l => l.name}
        onChange={handleChange}
        disabled={isUpdating}
        size="small"
        clearOnEscape
        sx={autocompleteSx}
        slotProps={{
          paper: { elevation: 3 },
          listbox: { style: { maxHeight: 240 } },
        }}
        renderInput={params => (
          <TextField
            {...params}
            placeholder="No label"
            aria-label={`Label for ${transaction.concept}`}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputValue.trim() === '') {
                handleChange(e as unknown as React.SyntheticEvent, NO_LABEL);
                setInputValue('');
              }
            }}
            sx={selectedLabel ? getSelectedLabelInputSx(selectedLabel.color) : noLabelInputSx}
          />
        )}
        renderOption={(props, label) => {
          const { key, ...restProps } = props;
          if (label.id === NO_LABEL.id) {
            return (
              <li key={key} {...restProps}>
                <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  No label
                </Box>
              </li>
            );
          }
          return (
            <li key={key} {...restProps}>
              <Chip
                label={label.name}
                size="small"
                sx={{
                  bgcolor: label.color,
                  color: contrastTextColor(label.color),
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              />
            </li>
          );
        }}
      />
    </TableCell>
  );
}
