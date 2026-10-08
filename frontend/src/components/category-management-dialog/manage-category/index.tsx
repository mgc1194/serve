// components/category-management-dialog/manage-category/index.tsx
//
// Create and edit mode — name input, type select (locked once created; the
// backend schema has no `type` field on update, so this is unchangeable
// after creation), and deactivate with confirmation (edit only). Assigning
// a household's labels to a category lands in a follow-up PR — the
// frontend's Label type still reflects an older, now-incompatible shape of
// that relationship (see PR description).

import {
  Alert,
  Box,
  Button,
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
import { useAutoFocus } from '@pages/households/label-management-dialog/manage-label/use-auto-focus';
import type { Category } from '@serve/types/global';

type CategoryType = 'spending' | 'earning';

interface ManageCategoryProps {
  mode: 'create' | 'edit';
  editingCategory: Category | null;
  name: string;
  type: CategoryType;
  isSaving: boolean;
  isDeleting: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onTypeChange: (value: CategoryType) => void;
  onSave: () => void;
  onDeactivate: (categoryId: number) => void;
  onBack: () => void;
  onDismissError: () => void;
}

export function ManageCategory({
  mode,
  editingCategory,
  name,
  type,
  isSaving,
  isDeleting,
  error,
  onNameChange,
  onTypeChange,
  onSave,
  onDeactivate,
  onBack,
  onDismissError,
}: ManageCategoryProps) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const nameInputRef = useAutoFocus<HTMLInputElement>();

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

      <FormControl size="small" fullWidth disabled={mode === 'edit' || isSaving || isDeleting}>
        <InputLabel id="category-type-label">Type</InputLabel>
        <Select
          labelId="category-type-label"
          label="Type"
          value={type}
          onChange={e => onTypeChange(e.target.value as CategoryType)}
        >
          <MenuItem value="spending">Spending</MenuItem>
          <MenuItem value="earning">Earning</MenuItem>
        </Select>
      </FormControl>
      {mode === 'edit' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
          Type can&apos;t be changed after creation — deactivate this category and create a new
          one instead.
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {mode === 'edit' && editingCategory ? (
          confirmDeactivate ? (
            <DeleteConfirmation
              prompt="Deactivate this category?"
              isDeleting={isDeleting}
              disabled={isSaving}
              onConfirm={() => onDeactivate(editingCategory.id)}
              onCancel={() => setConfirmDeactivate(false)}
            />
          ) : (
            <Button
              size="small"
              color="error"
              onClick={() => setConfirmDeactivate(true)}
              disabled={isSaving}
            >
              Deactivate
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
