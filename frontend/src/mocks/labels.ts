// src/mocks/labels.ts — Mocks for Label.

import type { Label } from '@serve/types/global';

export function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 1,
    name: 'Groceries',
    color: '#16a34a',
    category: 'Food',
    household_id: 1,
    ...overrides,
  };
}
