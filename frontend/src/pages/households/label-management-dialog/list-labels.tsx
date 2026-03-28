// pages/households/label-management-dialog/list-labels.tsx
//
// List mode — renders all labels as coloured chips with a per-label edit
// button (pencil icon) that opens the edit form. Deletion is handled inside
// the edit form to prevent accidental deletions.

import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

import type { Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';

interface ListLabelsProps {
  labels: Label[];
  isLoading: boolean;
  error: string | null;
  onEdit: (label: Label) => void;
  onNewLabel: () => void;
  onClose: () => void;
}

export function ListLabels({
  labels,
  isLoading,
  error,
  onEdit,
  onNewLabel,
  onClose,
}: ListLabelsProps) {
  return (
    <Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : labels.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No labels yet. Create one to start categorizing transactions.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {labels.map(label => (
            <Box key={label.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={label.name}
                size="small"
                sx={{
                  bgcolor: label.color,
                  color: contrastTextColor(label.color),
                  fontWeight: 500,
                }}
              />
              <Tooltip title={`Edit "${label.name}"`}>
                <IconButton
                  size="small"
                  aria-label={`Edit ${label.name}`}
                  onClick={() => onEdit(label)}
                  sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={onNewLabel}>
          New label
        </Button>
      </Box>
    </Box>
  );
}
