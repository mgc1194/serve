// pages/households/label-management-dialog/list-labels.tsx
//
// List mode — renders all labels as coloured chips with a per-label edit
// button (pencil icon) that opens the edit form. Deletion is handled inside
// the edit form to prevent accidental deletions.
//
// Keyboard navigation: the chip list is a toolbar (ARIA APG composite widget).
// Tab enters/exits the group as a single stop; arrow keys move between edit
// buttons within the group (roving tabindex pattern).

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
import { useRef, useState } from 'react';

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
  // Index of the currently "active" button in the toolbar (roving tabindex).
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleToolbarKeyDown(e: React.KeyboardEvent) {
    if (labels.length === 0) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (activeIndex + 1) % labels.length;
      setActiveIndex(next);
      buttonRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (activeIndex - 1 + labels.length) % labels.length;
      setActiveIndex(prev);
      buttonRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      buttonRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = labels.length - 1;
      setActiveIndex(last);
      buttonRefs.current[last]?.focus();
    }
  }

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
        <Box
          role="toolbar"
          aria-label="Labels"
          onKeyDown={handleToolbarKeyDown}
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}
        >
          {labels.map((label, index) => (
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
                  ref={el => { buttonRefs.current[index] = el; }}
                  size="small"
                  aria-label={`Edit ${label.name}`}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => {
                    setActiveIndex(index);
                    onEdit(label);
                  }}
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
