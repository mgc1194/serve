// components/switch-household-button/index.tsx — Text button, showing the
// active household's name, that opens the shared SwitchHouseholdDialog and
// updates the session-wide active household.
//
// To use as (part of) a page heading, nest it inside a real heading element
// — e.g. <Typography variant="h4"><SwitchHouseholdButton sx={{ font:
// 'inherit' }} /></Typography> — rather than restyling the button itself to
// look like a heading. A <button> is valid content inside <h1>-<h6>, so this
// keeps the page's heading in the accessibility tree for screen-reader
// heading navigation, while `font: 'inherit'` (not MUI's `typography` sx
// shorthand, which has no 'inherit' variant to look up) makes the button's
// text match the heading's size/weight.

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

  function handleSelect(household: Household) {
    setActiveHousehold(household);
    onChange?.(household);
    setOpen(false);
  }

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
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
