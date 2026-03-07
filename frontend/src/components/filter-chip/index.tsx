// pages/accounts/filter-chip.tsx — Reusable chip for active/inactive filter state.
//
// Renders a single selectable chip. When active it appears filled in the
// primary colour; when inactive it renders outlined. An optional onClear
// callback adds a delete icon so the active filter can be dismissed without
// cycling back through the "all" chip.

import { Chip } from '@mui/material';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** When provided, shows a delete icon on the active chip. */
  onClear?: () => void;
}

export function FilterChip({ label, active, onClick, onClear }: FilterChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      onClick={onClick}
      onDelete={active && onClear ? onClear : undefined}
      variant={active ? 'filled' : 'outlined'}
      color={active ? 'primary' : 'default'}
    />
  );
}
