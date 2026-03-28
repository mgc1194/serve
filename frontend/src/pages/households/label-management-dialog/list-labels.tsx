// pages/households/label-management-dialog/list-labels.tsx
//
// List mode — renders all labels as coloured chips with a per-label edit
// button (pencil icon) that opens the edit form. Deletion is handled inside
// the edit form to prevent accidental deletions.
//
// Keyboard navigation (listbox pattern):
//   Tab       — listbox is a single tab stop; Tab moves to [New label] → [Close]
//   ↑↓ / ←→  — move selection between labels
//   Home/End  — jump to first/last label
//   Enter     — open the edit form for the selected label

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const listboxRef = useRef<HTMLDivElement | null>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (labels.length === 0) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % labels.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + labels.length) % labels.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(labels.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onEdit(labels[activeIndex]);
    }
  }

  const activeOptionId =
    labels.length > 0 ? `label-option-${labels[activeIndex].id}` : undefined;

  return (
    <Box sx={{ pt: 1 }}>
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
        <>
          <Box
            ref={listboxRef}
            role="listbox"
            aria-label="Labels"
            aria-activedescendant={isFocused ? activeOptionId : undefined}
            tabIndex={0}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mb: 1,
              borderRadius: 1,
              outline: 'none',
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
              },
            }}
          >
            {labels.map((label, index) => (
              <Box
                key={label.id}
                id={`label-option-${label.id}`}
                role="option"
                aria-selected={index === activeIndex}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Chip
                  label={label.name}
                  size="small"
                  sx={{
                    bgcolor: label.color,
                    color: contrastTextColor(label.color),
                    fontWeight: 500,
                    ...(isFocused && index === activeIndex && {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: '2px',
                    }),
                  }}
                />
                <Tooltip title={`Edit "${label.name}"`}>
                  <IconButton
                    size="small"
                    aria-label={`Edit ${label.name}`}
                    tabIndex={-1}
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
          <Typography
            variant="caption"
            color="text.disabled"
            data-focused={isFocused}
            sx={{ display: 'block', mb: 2, visibility: isFocused ? 'visible' : 'hidden' }}
          >
            Arrow keys to navigate · Enter to edit
          </Typography>
        </>
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
