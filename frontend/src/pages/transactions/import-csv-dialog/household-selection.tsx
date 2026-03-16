// pages/transactions/import-csv-dialog/household-selection.tsx
//
// Step 0 — Household selection: user picks which household to import into.

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

import type { Household } from '@serve/types/global';

interface HouseholdSelectionProps {
  households: Household[];
  householdId: number | '';
  setHouseholdId: (id: number | '') => void;
}

export function HouseholdSelection({
  households,
  householdId,
  setHouseholdId,
}: HouseholdSelectionProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose the household you're importing transactions for.
      </Typography>
      <FormControl fullWidth size="small" disabled={households.length === 0}>
        <InputLabel id="import-household-label">Household</InputLabel>
        <Select
          labelId="import-household-label"
          value={householdId}
          label="Household"
          onChange={e => setHouseholdId(e.target.value as number)}
        >
          {households.map(h => (
            <MenuItem key={h.id} value={h.id}>
              {h.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
