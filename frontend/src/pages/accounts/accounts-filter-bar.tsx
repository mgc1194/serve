// pages/accounts/accounts-filter-bar.tsx — Filter bar for the accounts table.
//
// Renders a group of FilterChips for household filtering.
// Each household chip has an "All" chip that clears the filter.
// The active chip shows a delete icon for quick clearing.

import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, Paper, Toolbar, Typography } from '@mui/material';

import { FilterChip } from '@components/filter-chip';
import type { Household } from '@serve/types/global';

interface AccountsFilterBarProps {
  households: Household[];
  householdId: number | undefined;
  onHouseholdChange: (id: number | undefined) => void;
}

export function AccountsFilterBar({
  households,
  householdId,
  onHouseholdChange,
}: AccountsFilterBarProps) {
  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}
    >
      <Toolbar
        variant="dense"
        sx={{ gap: 2, px: 2, flexWrap: 'wrap', minHeight: 56, alignItems: 'center' }}
      >
        <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18, flexShrink: 0 }} />
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ flexShrink: 0 }}>
          Filter
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterChip
            label="All households"
            active={householdId == null}
            onClick={() => onHouseholdChange(undefined)}
          />
          {households.map(h => (
            <FilterChip
              key={h.id}
              label={h.name}
              active={householdId === h.id}
              onClick={() => onHouseholdChange(h.id)}
              onClear={() => onHouseholdChange(undefined)}
            />
          ))}
        </Box>
      </Toolbar>
    </Paper>
  );
}
