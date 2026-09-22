// pages/transactions/label-filter-bar.tsx — Label filter for the transactions
// table.
//
// A searchable single-select so this stays usable with many labels (a chip
// row, tried first, became unwieldy past a handful). "Unlabeled" uses the
// same -1 sentinel already established by NO_LABEL in
// transaction-label-cell.tsx, understood by the backend's label_id filter.

import { Autocomplete, Box, Chip, TextField } from '@mui/material';

import type { Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';

const UNLABELED_OPTION: Label = {
  id: -1,
  name: 'Unlabeled',
  color: '',
  category: '',
  household_id: -1,
};

interface LabelFilterBarProps {
  labels: Label[];
  labelId: number | undefined;
  onLabelChange: (id: number | undefined) => void;
}

export function LabelFilterBar({ labels, labelId, onLabelChange }: LabelFilterBarProps) {
  const options = [UNLABELED_OPTION, ...labels];
  const selected = options.find(l => l.id === labelId) ?? null;

  return (
    <Box sx={{ mb: 3 }}>
      <Autocomplete
        value={selected}
        onChange={(_event, value) => onLabelChange(value?.id)}
        options={options}
        getOptionLabel={l => l.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        size="small"
        sx={{ width: 260 }}
        renderInput={params => (
          <TextField {...params} label="Filter by label" placeholder="All labels" />
        )}
        renderOption={(props, label) => {
          const { key, ...rest } = props;
          if (label.id === UNLABELED_OPTION.id) {
            return (
              <li key={key} {...rest}>
                <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  Unlabeled
                </Box>
              </li>
            );
          }
          return (
            <li key={key} {...rest}>
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
    </Box>
  );
}
