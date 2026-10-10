// manage-label/use-auto-focus.ts

import { useEffect, useRef } from 'react';

/** Focuses the referenced input after a short delay (lets MUI Dialog animate in). */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);
  return ref;
}
