// pages/households/household-detailed-card/add-household-member-form.tsx — Email input for adding a member.

import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Tooltip,
} from '@mui/material';
import { useState } from 'react';

import type { HouseholdDetail } from '@serve/types/global';
import { addMember, ApiError } from '@services/households';

interface AddHouseholdMemberFormProps {
  householdId: number;
  onMemberAdded: (household: HouseholdDetail) => void;
}

export function AddHouseholdMemberForm({ householdId, onMemberAdded }: AddHouseholdMemberFormProps) {
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsAdding(true);
    setError(null);
    try {
      const updated = await addMember(householdId, trimmed);
      onMemberAdded(updated);
      setEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add member.');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <OutlinedInput
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Add by email address"
          inputProps={{ 'aria-label': 'Member email' }}
          size="small"
          fullWidth
          disabled={isAdding}
          endAdornment={
            isAdding && (
              <InputAdornment position="end">
                <CircularProgress size={14} />
              </InputAdornment>
            )
          }
        />
        <Tooltip title="Add member">
          <span>
            <IconButton
              onClick={handleSubmit}
              disabled={!email.trim() || isAdding}
              color="primary"
              size="small"
              aria-label="Add member"
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                height: 40,
                width: 40,
              }}
            >
              <PersonAddOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}