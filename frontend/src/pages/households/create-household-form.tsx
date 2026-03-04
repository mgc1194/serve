import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  OutlinedInput,
} from '@mui/material';
import { useRef, useState } from 'react';

import { createHousehold, ApiError } from '@serve/services/households';
import type { HouseholdDetail } from '@serve/types/global';

interface CreateHouseholdFormProps {
  onCreate: (household: HouseholdDetail) => void;
}

export function CreateHouseholdForm({ onCreate }: CreateHouseholdFormProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createHousehold(trimmed);
      onCreate(created);
      setName('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create household.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <OutlinedInput
          inputRef={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Household name"
          size="small"
          fullWidth
          disabled={isCreating}
          endAdornment={
            isCreating && (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            )
          }
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
        >
          Create
        </Button>
      </Box>
    </Box>
  );
}
