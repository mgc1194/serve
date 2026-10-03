// components/category-multi-select/index.tsx — Checkbox multi-select for
// picking several categories at once.
//
// A household's categories are a small, fixed catalog, not something worth
// searching — a single-select dropdown also forces adding categories one at
// a time. Checkboxes let several be picked in one pass before the caller
// submits them together (e.g. one "Add" click).

import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import type { Category } from '@serve/types/global';

interface CategoryMultiSelectProps {
  categories: Category[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  disabled?: boolean;
}

export function CategoryMultiSelect({
  categories,
  selectedIds,
  onChange,
  label = 'Add categories',
  disabled = false,
}: CategoryMultiSelectProps) {
  const labelId = `category-multi-select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  function handleChange(event: SelectChangeEvent<number[]>) {
    const value = event.target.value;
    onChange(typeof value === 'string' ? [] : value);
  }

  return (
    <FormControl size="small" fullWidth disabled={disabled || categories.length === 0}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select<number[]>
        labelId={labelId}
        label={label}
        multiple
        value={selectedIds}
        onChange={handleChange}
        renderValue={selected =>
          categories
            .filter(c => selected.includes(c.id))
            .map(c => c.name)
            .join(', ')
        }
      >
        {categories.map(category => (
          <MenuItem key={category.id} value={category.id}>
            <Checkbox checked={selectedIds.includes(category.id)} size="small" />
            <ListItemText primary={category.name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
