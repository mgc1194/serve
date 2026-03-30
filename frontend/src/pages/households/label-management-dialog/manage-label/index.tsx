// pages/households/label-management-dialog/manage-label/index.tsx
//
// Create and edit mode — name input, colour picker with hex preview chip,
// delete with confirmation (edit only), and Back / Save actions.
//
// Category field is intentionally omitted until the budget.Category model
// and migration are implemented (Issue 1/2).

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { DeleteConfirmation } from '@components/delete-confirmation';
import { LabelColorField } from '@pages/households/label-management-dialog/manage-label/label-color-field';
import { useAutoFocus } from '@pages/households/label-management-dialog/manage-label/use-auto-focus';
import type { Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';


interface ManageLabelProps {
  mode: 'create' | 'edit';
  editingLabel: Label | null;
  name: string;
  color: string;
  isSaving: boolean;
  isDeleting: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: () => void;
  onDelete: (labelId: number) => void;
  onBack: () => void;
  onDismissError: () => void;
}

const DEFAULT_COLOR = '#6B7280';

export function ManageLabel({
  mode,
  editingLabel,
  name,
  color,
  isSaving,
  isDeleting,
  error,
  onNameChange,
  onColorChange,
  onSave,
  onDelete,
  onBack,
  onDismissError,
}: ManageLabelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameInputRef = useAutoFocus<HTMLInputElement>();

  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(color);
  const previewColor = isValidColor ? color : DEFAULT_COLOR;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {error && (
        <Alert severity="error" onClose={onDismissError}>
          {error}
        </Alert>
      )}

      <TextField
        inputRef={nameInputRef}
        label="Name"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !isSaving && !isDeleting && onSave()}
        size="small"
        fullWidth
        disabled={isSaving || isDeleting}
      />

      <LabelColorField
        color={color}
        disabled={isSaving || isDeleting}
        onChange={onColorChange}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Preview:
        </Typography>
        <Chip
          label={name || 'Label name'}
          size="small"
          sx={{ bgcolor: previewColor, color: contrastTextColor(previewColor), fontWeight: 500 }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {mode === 'edit' && editingLabel ? (
          confirmDelete ? (
            <DeleteConfirmation
              prompt="Delete this label?"
              isDeleting={isDeleting}
              disabled={isSaving}
              onConfirm={() => onDelete(editingLabel.id)}
              onCancel={() => setConfirmDelete(false)}
            />
          ) : (
            <Button
              size="small"
              color="error"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving}
            >
              Delete
            </Button>
          )
        ) : (
          <Box />
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onBack} disabled={isSaving || isDeleting}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!name.trim() || isSaving || isDeleting}
            startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
