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

  // Clamp activeIndex at render time in case labels shrink (e.g. after a delete
  // or refetch) while the component stays mounted — no effect needed.
  const safeIndex = labels.length > 0 ? Math.min(activeIndex, labels.length - 1) : 0;
  const activeLabel = labels.length > 0 ? labels[safeIndex] : undefined;
  const activeOptionId = activeLabel ? `label-option-${activeLabel.id}` : undefined;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (labels.length === 0) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((safeIndex + 1) % labels.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((safeIndex - 1 + labels.length) % labels.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(labels.length - 1);
    } else if (e.key === 'Enter' && activeLabel) {
      e.preventDefault();
      onEdit(activeLabel);
    }
  }

  // Fix #2 — only treat the listbox as focused when the listbox element itself
  // has focus, not when a descendant (e.g. an IconButton clicked via mouse) does.
  // onFocus/onBlur bubble in React, so we check e.currentTarget === e.target for
  // focus-in, and use relatedTarget to detect focus truly leaving the subtree for
  // focus-out.
  function handleFocus(e: React.FocusEvent) {
    if (e.target === e.currentTarget) {
      setIsFocused(true);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    // relatedTarget is the element receiving focus next. If it's still inside
    // the listbox subtree we don't clear the focused state.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsFocused(false);
    }
  }

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
            onFocus={handleFocus}
            onBlur={handleBlur}
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
                aria-selected={index === safeIndex}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Chip
                  label={label.name}
                  size="small"
                  sx={{
                    bgcolor: label.color,
                    color: contrastTextColor(label.color),
                    fontWeight: 500,
                    ...(isFocused && index === safeIndex && {
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
