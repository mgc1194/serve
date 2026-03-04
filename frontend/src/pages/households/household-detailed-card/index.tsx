// pages/households/household-detailed-card/index.tsx — Full management card for a single household.
//
// Displays household name with inline rename, member list with add-by-email,
// and delete with inline confirmation. All actions are self-contained.

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  OutlinedInput,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { AddHouseholdMemberForm } from '@pages/households/household-detailed-card/add-household-member-form';
import { HouseholdMemberList } from '@pages/households/household-detailed-card/household-member-list';
import { renameHousehold, deleteHousehold, ApiError } from '@serve/services/households';
import type { HouseholdDetail } from '@serve/types/global';

interface HouseholdDetailCardProps {
  household: HouseholdDetail;
  onUpdated: (household: HouseholdDetail) => void;
  onDeleted: (id: number) => void;
}

export function HouseholdDetailCard({ household, onUpdated, onDeleted }: HouseholdDetailCardProps) {
  // Rename
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(household.name);
  const [isSaving, setIsSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEditing() {
    setEditName(household.name);
    setRenameError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setRenameError(null);
  }

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (trimmed === household.name) { setIsEditing(false); return; }

    setIsSaving(true);
    setRenameError(null);
    try {
      const updated = await renameHousehold(household.id, trimmed);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : 'Could not rename household.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteHousehold(household.id);
      onDeleted(household.id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete household.');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      {/* Header — name + rename */}
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        {isEditing ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OutlinedInput
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') cancelEditing();
                }}
                size="small"
                disabled={isSaving}
                sx={{
                  fontSize: '1.25rem',
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  flex: 1,
                }}
              />
              <Tooltip title="Save">
                <span>
                  <IconButton
                    onClick={handleRename}
                    disabled={isSaving || !editName.trim()}
                    color="primary"
                    size="small"
                    aria-label="Save"
                  >
                    {isSaving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton onClick={cancelEditing} disabled={isSaving} size="small" aria-label="Cancel">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {renameError && (
              <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRenameError(null)}>
                {renameError}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontFamily: '"DM Serif Display", Georgia, serif', flex: 1 }}
            >
              {household.name}
            </Typography>
            <Tooltip title="Rename">
              <IconButton
                onClick={startEditing}
                size="small"
                aria-label="Rename"
                sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Members */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Members
        </Typography>
        <Box sx={{ mb: 2 }}>
          <HouseholdMemberList members={household.members} />
        </Box>
        <AddHouseholdMemberForm householdId={household.id} onMemberAdded={onUpdated} />
      </Box>

      <Divider />

      {/* Footer — delete */}
      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {deleteError ? (
          <Alert severity="error" sx={{ flex: 1 }} onClose={() => setDeleteError(null)}>
            {deleteError}
          </Alert>
        ) : confirmDelete ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Delete <strong>{household.name}</strong>? This cannot be undone.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Yes, delete
            </Button>
            <Button size="small" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="small"
            color="error"
            onClick={() => setConfirmDelete(true)}
            sx={{ ml: 'auto' }}
          >
            Delete household
          </Button>
        )}
      </Box>
    </Paper>
  );
}
