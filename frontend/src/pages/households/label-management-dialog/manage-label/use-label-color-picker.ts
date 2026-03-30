// manage-label/use-label-color-picker.ts

import { useState } from 'react';

export function useLabelColorPicker() {
  const [open, setOpen] = useState(false);
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
  };
}
