// components/label-management-dialog/manage-label/index.tsx
//
// Create and edit mode — name input, category picker, colour picker with
// hex preview chip, delete with confirmation (edit only), and Back / Save
// actions.
//
// The category picker sits between Name and the colour picker: it's a
// classification field like Name (mirrors ManageCategory's own Name-then-
// Type ordering), and keeping it out of the colour-picker/preview-chip
// pair leaves that visual pairing unbroken. Options are a household's
// active categories only (categories are fetched by the dialog, not this
// component) — matching CategoryManagementDialog's own scope, a deactivated
// category already assigned to a label simply won't appear as an option.

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { DeleteConfirmation } from '@components/delete-confirmation';
import { LabelColorField } from '@components/label-management-dialog/manage-label/label-color-field';
import { useAutoFocus } from '@components/label-management-dialog/manage-label/use-auto-focus';
import type { Category, Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';


interface ManageLabelProps {
  mode: 'create' | 'edit';
  editingLabel: Label | null;
  name: string;
  color: string;
  categories: Category[];
  categoryId: number | null;
  isSaving: boolean;
  isDeleting: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onCategoryChange: (value: number | null) => void;
  onSave: () => void;
  onDelete: (labelId: number) => void;
  onBack: () => void;
  onDismissError: () => void;
}

const DEFAULT_COLOR = '#6B7280';

// A real, non-empty sentinel for "no category" — using '' here instead
// makes MUI's OutlinedInput treat the field as "not filled" only in that
// state, so the border's notch/label-shrink would inconsistently differ
// between "No category" and an actual selection.
const NO_CATEGORY = 'none';

export function ManageLabel({
  mode,
  editingLabel,
  name,
  color,
  categories,
  categoryId,
  isSaving,
  isDeleting,
  error,
  onNameChange,
  onColorChange,
  onCategoryChange,
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

      <FormControl size="small" fullWidth disabled={isSaving || isDeleting}>
        <InputLabel id="label-category-select">Category</InputLabel>
        <Select
          labelId="label-category-select"
          label="Category"
          value={categoryId === null ? NO_CATEGORY : String(categoryId)}
          onChange={e => onCategoryChange(e.target.value === NO_CATEGORY ? null : Number(e.target.value))}
        >
          <MenuItem value={NO_CATEGORY}>
            <em>No category</em>
          </MenuItem>
          {categories.map(category => (
            <MenuItem key={category.id} value={String(category.id)}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
