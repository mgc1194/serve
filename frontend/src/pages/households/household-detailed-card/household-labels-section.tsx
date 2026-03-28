// pages/households/household-detailed-card/household-labels-section.tsx
//
// Displays up to 5 label chips for a household. "Add label" opens the
// management dialog in create mode; "Manage" opens it in list mode.

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useState } from 'react';

import { LabelManagementDialog } from '@pages/households/label-management-dialog';
import type { Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';

const MAX_PREVIEW = 5;

interface HouseholdLabelsSectionProps {
  householdId: number;
  householdName: string;
  labels: Label[];
  onLabelsChanged: (labels: Label[]) => void;
}

export function HouseholdLabelsSection({
  householdId,
  householdName,
  labels,
  onLabelsChanged,
}: HouseholdLabelsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitialMode, setDialogInitialMode] = useState<'list' | 'create'>('list');

  const preview = labels.slice(0, MAX_PREVIEW);
  const overflow = labels.length - MAX_PREVIEW;

  function openManage() {
    setDialogInitialMode('list');
    setDialogOpen(true);
  }

  function openCreate() {
    setDialogInitialMode('create');
    setDialogOpen(true);
  }

  return (
    <>
      <Box>
        <Typography variant="subtitle2" component="h5" color="text.secondary" sx={{ mb: 1.5 }}>
          Labels
        </Typography>

        {labels.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>
            No labels yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
            {preview.map(label => (
              <Chip
                key={label.id}
                label={label.name}
                size="small"
                onClick={openManage}
                sx={{
                  bgcolor: label.color,
                  color: contrastTextColor(label.color),
                  fontWeight: 500,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85 },
                }}
              />
            ))}
            {overflow > 0 && (
              <Chip
                label={`+${overflow} more`}
                size="small"
                variant="outlined"
                onClick={openManage}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={openCreate}
            variant="outlined"
            sx={{ fontSize: '0.75rem', py: 0.5 }}
          >
            Add label
          </Button>
          {labels.length > 0 && (
            <Button
              size="small"
              onClick={openManage}
              sx={{ fontSize: '0.75rem', py: 0.5, color: 'text.secondary' }}
            >
              Manage
            </Button>
          )}
        </Box>
      </Box>

      <LabelManagementDialog
        open={dialogOpen}
        householdId={householdId}
        householdName={householdName}
        initialMode={dialogInitialMode}
        onClose={() => setDialogOpen(false)}
        onLabelsChanged={updated => {
          onLabelsChanged(updated);
          // Keep dialog open so the user can continue managing
        }}
      />
    </>
  );
}
