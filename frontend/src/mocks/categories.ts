// src/mocks/categories.ts — Mocks for Category.

import type { Category } from '@serve/types/global';

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    name: 'Groceries',
    type: 'spending',
    is_active: true,
    household_id: 1,
    ...overrides,
  };
}
