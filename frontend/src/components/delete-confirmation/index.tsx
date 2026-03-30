// components/delete-confirmation.tsx

import { Box, Button, CircularProgress, Typography } from '@mui/material';

interface DeleteConfirmationProps {
  /** Label for the prompt text. Defaults to "Delete?" */
  prompt?: string;
  isDeleting: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmation({
  prompt = 'Delete?',
  isDeleting,
  disabled = false,
  onConfirm,
  onCancel,
}: DeleteConfirmationProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {prompt}
      </Typography>
      <Button
        size="small"
        color="error"
        variant="contained"
        onClick={onConfirm}
        disabled={isDeleting || disabled}
        startIcon={isDeleting ? <CircularProgress size={14} color="inherit" /> : null}
      >
        Yes
      </Button>
      <Button size="small" onClick={onCancel} disabled={isDeleting || disabled}>
        No
      </Button>
    </Box>
  );
}
