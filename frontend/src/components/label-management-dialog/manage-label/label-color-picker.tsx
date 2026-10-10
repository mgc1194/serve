// manage-label/label-color-picker.tsx

import { Box, Paper, Typography } from '@mui/material';

const RAINBOW_COLORS = [
  { hex: '#b60205', label: 'Red' },
  { hex: '#d93f0b', label: 'Orange' },
  { hex: '#fbca04', label: 'Yellow' },
  { hex: '#0e8a16', label: 'Green' },
  { hex: '#006b75', label: 'Teal' },
  { hex: '#1d76db', label: 'Blue' },
  { hex: '#0052cc', label: 'Navy' },
  { hex: '#5319e7', label: 'Purple' },
  { hex: '#e99695', label: 'Pink' },
  { hex: '#f9d0c4', label: 'Light Pink' },
  { hex: '#fef2c0', label: 'Light Yellow' },
  { hex: '#c2e0c6', label: 'Light Green' },
  { hex: '#bfdadc', label: 'Light Teal' },
  { hex: '#c5def5', label: 'Light Blue' },
  { hex: '#bfd4f2', label: 'Light Indigo' },
  { hex: '#d4c5f9', label: 'Lavender' },
] as const;

const ROW_SIZE = 8;

interface LabelColorPickerProps {
  open: boolean;
  selectedColor: string;
  onSelect: (hex: string) => void;
}

export function LabelColorPicker({ open, selectedColor, onSelect }: LabelColorPickerProps) {
  if (!open) return null;

  const rows = [RAINBOW_COLORS.slice(0, ROW_SIZE), RAINBOW_COLORS.slice(ROW_SIZE)];

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        zIndex: 1300,
        p: 1.25,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        Default colors
      </Typography>
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 0.625, mb: rowIndex < rows.length - 1 ? 0.625 : 0 }}>
          {row.map(({ hex, label }) => (
            <Box
              key={hex}
              component="button"
              tabIndex={0}
              aria-label={`${label} (${hex})`}
              onMouseDown={e => {
                // Prevent the text input from blurring before onSelect fires.
                e.preventDefault();
                onSelect(hex);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(hex);
                }
              }}
              sx={{
                width: 22,
                height: 22,
                borderRadius: 0.5,
                bgcolor: hex,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                p: 0,
                outline: selectedColor === hex ? '2px solid' : 'none',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
                '&:hover': { transform: 'scale(1.15)' },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
                transition: 'transform 0.1s',
              }}
            />
          ))}
        </Box>
      ))}
    </Paper>
  );
}
