// components/switch-household-dialog/index.tsx — Shared "switch active
// household" dialog.
//
// Lists all of the user's households; selecting one calls onSelect. Reused
// across the Accounts, Transactions, and Summary pages via
// SwitchHouseholdButton.

import CheckIcon from '@mui/icons-material/Check';
import { Dialog, DialogTitle, List, ListItemButton, ListItemText } from '@mui/material';

import type { Household } from '@serve/types/global';

interface SwitchHouseholdDialogProps {
  open: boolean;
  households: Household[];
  activeHouseholdId: number | null;
  onSelect: (household: Household) => void;
  onClose: () => void;
}

export function SwitchHouseholdDialog({
  open,
  households,
  activeHouseholdId,
  onSelect,
  onClose,
}: SwitchHouseholdDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Switch household</DialogTitle>
      <List disablePadding sx={{ pb: 1 }}>
        {households.map(h => (
          <ListItemButton
            key={h.id}
            selected={h.id === activeHouseholdId}
            onClick={() => onSelect(h)}
            sx={{ mx: 1, my: 0.25, borderRadius: 1 }}
          >
            <ListItemText primary={h.name} />
            {h.id === activeHouseholdId && (
              <CheckIcon color="primary" fontSize="small" />
            )}
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
