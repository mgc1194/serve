// pages/transactions/transactions-table/transaction-label-cell.styles.ts
//
// sx helpers for TransactionLabelCell. Kept separate to avoid bloating the
// component with MUI class-name overrides.

import type { SxProps, Theme } from '@mui/material';
import { contrastTextColor } from '@utils/contrast-text-color';

export function getSelectedLabelInputSx(color: string): SxProps<Theme> {
  const textColor = contrastTextColor(color);
  return {
    minWidth: 160,
    '& .MuiOutlinedInput-root': {
      bgcolor: color,
      borderRadius: '16px',
      paddingRight: '20%',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': {
        border: '2px solid',
        borderColor: color,
        filter: 'brightness(0.85)',
      },
    },
    '& .MuiInputBase-input': {
      color: textColor,
      fontWeight: 500,
      fontSize: '0.8125rem',
      caretColor: textColor,
      width: '80%',
    },
    '& .MuiAutocomplete-endAdornment': {
      width: '20%',
      display: 'flex',
      justifyContent: 'center',
      right: 0,
    },
    '& .MuiAutocomplete-popupIndicator': {
      color: textColor,
    },
  };
}

export const autocompleteSx: SxProps<Theme> = {
  '& .MuiAutocomplete-clearIndicator': { display: 'none' },
};

export const noLabelInputSx: SxProps<Theme> = {
  minWidth: 160,
};
