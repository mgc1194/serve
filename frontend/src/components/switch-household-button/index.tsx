// components/switch-household-button/index.tsx — Button that opens the
// shared SwitchHouseholdDialog and updates the session-wide active
// household. Pass `sx` to match a page's own heading style (e.g.
// TransactionsPage renders it in place of an h4 page title via
// `sx={{ typography: 'h4' }}`).

import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useState } from 'react';

import { SwitchHouseholdDialog } from '@components/switch-household-dialog';
import { useActiveHousehold } from '@context/active-household-context';
import type { Household } from '@serve/types/global';

interface SwitchHouseholdButtonProps {
  sx?: SxProps<Theme>;
  /** Called after the active household changes via this button — e.g. to
   * reset page-local, household-scoped state such as pagination. */
  onChange?: (household: Household) => void;
}

export function SwitchHouseholdButton({ sx, onChange }: SwitchHouseholdButtonProps) {
  const { activeHousehold, households, setActiveHousehold } = useActiveHousehold();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={() => setOpen(true)}
        disabled={households.length === 0}
        endIcon={households.length > 1 ? <UnfoldMoreIcon fontSize="small" /> : undefined}
        sx={{ textTransform: 'none', px: 1, ...sx }}
      >
        {activeHousehold?.name ?? 'Select household'}
      </Button>
      <SwitchHouseholdDialog
        open={open}
        households={households}
        activeHouseholdId={activeHousehold?.id ?? null}
        onSelect={household => {
          setActiveHousehold(household);
          onChange?.(household);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
