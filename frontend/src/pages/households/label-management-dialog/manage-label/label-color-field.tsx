// manage-label/label-color-field.tsx

import { Box, TextField } from '@mui/material';
import { useState } from 'react';

import { LabelColorPicker } from '@pages/households/label-management-dialog/manage-label/label-color-picker';

const DEFAULT_COLOR = '#6B7280';

interface LabelColorFieldProps {
  color: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function LabelColorField({ color, disabled, onChange }: LabelColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [swatchFocused, setSwatchFocused] = useState(false);

  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(color);
  const previewColor = isValidColor ? color : DEFAULT_COLOR;

  // Close only when focus leaves the entire container subtree — including
  // the picker swatches. relatedTarget is the element receiving focus next;
  // if it's still inside this container, we stay open.
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <Box onBlur={handleBlur} sx={{ position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Color"
          value={color}
          onChange={e => onChange(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          size="small"
          fullWidth
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: 7 } }}
        />
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: previewColor,
            border: 1,
            borderColor: 'divider',
            flexShrink: 0,
            cursor: 'pointer',
            position: 'relative',
            outline: swatchFocused ? '2px solid' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          }}
        >
          <input
            type="color"
            aria-label="Choose label color"
            value={previewColor}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setSwatchFocused(true)}
            onBlur={() => setSwatchFocused(false)}
            disabled={disabled}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
            }}
          />
        </Box>
      </Box>

      <LabelColorPicker
        open={open}
        selectedColor={color}
        onSelect={hex => {
          onChange(hex);
          setOpen(false);
        }}
      />
    </Box>
  );
}
