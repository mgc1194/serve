// pages/households/label-management-dialog/manage-label.tsx
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
import { useEffect, useRef, useState } from 'react';

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

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Defer focus so MUI's Dialog animation completes first.
    const id = setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(color);
  const previewColor = isValidColor ? color : DEFAULT_COLOR;
  const [colorInputFocused, setColorInputFocused] = useState(false);

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

      {/* Colour: hex input + native colour picker swatch */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Color"
          value={color}
          onChange={e => onColorChange(e.target.value)}
          size="small"
          fullWidth
          disabled={isSaving || isDeleting}
          slotProps={{ htmlInput: { maxLength: 7 } }}
        />
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: previewColor,
            border: 1,
            borderColor: 'divider',
            flexShrink: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
            outline: colorInputFocused ? '2px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          }}
        >
          <input
            type="color"
            aria-label="Choose label color"
            value={previewColor}
            onChange={e => onColorChange(e.target.value)}
            onFocus={() => setColorInputFocused(true)}
            onBlur={() => setColorInputFocused(false)}
            disabled={isSaving || isDeleting}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
            }}
          />
        </Box>
      </Box>

      {/* Live preview */}
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

      {/* Actions row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Delete — edit mode only */}
        {mode === 'edit' && editingLabel ? (
          confirmDelete ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Delete this label?
              </Typography>
              <Button
                size="small"
                color="error"
                variant="contained"
                onClick={() => onDelete(editingLabel.id)}
                disabled={isDeleting || isSaving}
                startIcon={isDeleting ? <CircularProgress size={14} color="inherit" /> : null}
              >
                Yes
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting || isSaving}
              >
                No
              </Button>
            </Box>
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
