// pages/transactions/transactions-table/transaction-label-cell.tsx —
// Label autocomplete with optimistic updates. Immediately reflects the
// selected label as a colored chip and reverts on API failure.

import { Autocomplete, Box, Chip, TableCell, TextField } from '@mui/material';
import { useState } from 'react';

import type { Label, Transaction } from '@serve/types/global';
import { ApiError, updateTransactionLabel } from '@services/transactions';
import { contrastTextColor } from '@utils/contrast-text-color';

interface TransactionLabelCellProps {
  transaction: Transaction;
  labels: Label[];
  onUpdated: (transaction: Transaction) => void;
  onError: (message: string | null) => void;
}

export function TransactionLabelCell({
  transaction,
  labels,
  onUpdated,
  onError,
}: TransactionLabelCellProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedLabel = labels.find(l => l.id === transaction.label_id) ?? null;

  async function handleChange(_event: React.SyntheticEvent, selected: Label | null) {
    const newLabelId = selected?.id ?? null;

    // Optimistic update
    const optimistic: Transaction = {
      ...transaction,
      label_id: newLabelId,
      label_name: selected?.name ?? null,
      label_color: selected?.color ?? null,
    };
    onUpdated(optimistic);
    setIsUpdating(true);
    onError(null);

    try {
      const updated = await updateTransactionLabel(transaction.id, newLabelId);
      onUpdated(updated);
    } catch (err) {
      onUpdated(transaction); // revert
      onError(err instanceof ApiError ? err.message : 'Could not update label.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <TableCell sx={{ py: 1.5 }}>
      <Autocomplete
        value={selectedLabel}
        options={labels}
        getOptionLabel={l => l.name}
        onChange={handleChange}
        disabled={isUpdating}
        size="small"
        clearOnEscape
        ListboxProps={{ style: { maxHeight: 240 } }}
        renderInput={params => (
          // When a label is selected, hide the native input text and overlay
          // the colored chip instead. The input remains in the DOM (unfocused,
          // visually hidden) so MUI's Autocomplete keyboard behavior is intact.
          <Box sx={{ position: 'relative', minWidth: 140 }}>
            <TextField
              {...params}
              placeholder={selectedLabel ? undefined : 'No label'}
              aria-label={`Label for ${transaction.concept}`}
              sx={{
                '& .MuiInputBase-input': {
                  // Hide the text input when a chip is shown so they don't overlap,
                  // but keep it focusable so the user can type to search / clear.
                  color: selectedLabel ? 'transparent' : undefined,
                },
              }}
            />
            {selectedLabel && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  // Align with MUI's small TextField content area, leaving
                  // room for the clear (×) button that appears on the right.
                  left: 10,
                  right: 36,
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none', // clicks fall through to the input
                }}
              >
                <Chip
                  label={selectedLabel.name}
                  size="small"
                  sx={{
                    bgcolor: selectedLabel.color,
                    color: contrastTextColor(selectedLabel.color),
                    fontWeight: 500,
                    maxWidth: '100%',
                  }}
                />
              </Box>
            )}
          </Box>
        )}
        renderOption={(props, label) => (
          <li {...props} key={label.id}>
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
        )}
        slotProps={{ paper: { elevation: 3 } }}
      />
    </TableCell>
  );
}
