// components/switch-household-button/index.tsx — Trigger that opens the
// shared SwitchHouseholdDialog and updates the session-wide active
// household.
//
// Default: a text button showing the household name (Accounts, Summary).
// `iconOnly`: a small icon-only trigger meant to sit next to an existing
// page heading (e.g. TransactionsPage) — never restyle a heading itself
// into this button, since that drops it from the accessibility tree's
// heading list. Render the heading as real Typography/h-tag text and place
// this next to it instead.

import ChangeCircleOutlinedIcon from '@mui/icons-material/ChangeCircleOutlined';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Button, IconButton } from '@mui/material';
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
  /** Render as a small icon-only trigger instead of a text button showing
   * the household name. */
  iconOnly?: boolean;
}

export function SwitchHouseholdButton({ sx, onChange, iconOnly = false }: SwitchHouseholdButtonProps) {
  const { activeHousehold, households, setActiveHousehold } = useActiveHousehold();
  const [open, setOpen] = useState(false);

  function handleSelect(household: Household) {
    setActiveHousehold(household);
    onChange?.(household);
    setOpen(false);
  }

  return (
    <>
      {iconOnly ? (
        <IconButton
          onClick={() => setOpen(true)}
          disabled={households.length === 0}
          aria-label="Switch household"
          size="small"
          sx={sx}
        >
          <ChangeCircleOutlinedIcon fontSize="small" />
        </IconButton>
      ) : (
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
      )}
      <SwitchHouseholdDialog
        open={open}
        households={households}
        activeHouseholdId={activeHousehold?.id ?? null}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
