import { describe, expect, it } from 'vitest';

import { columnKeyToSortField, nextSortDir } from './use-sort';

describe('columnKeyToSortField', () => {
  it('maps each supported column key to the matching server sort field', () => {
    expect(columnKeyToSortField('date')).toBe('date');
    expect(columnKeyToSortField('concept')).toBe('concept');
    expect(columnKeyToSortField('amount')).toBe('amount');
    expect(columnKeyToSortField('account')).toBe('account');
    expect(columnKeyToSortField('label')).toBe('label');
    expect(columnKeyToSortField('category')).toBe('category');
  });
});

describe('nextSortDir', () => {
  it('starts a newly clicked column in ascending order', () => {
    expect(nextSortDir('concept', 'date', 'asc')).toBe('asc');
    expect(nextSortDir('amount', 'date', 'desc')).toBe('asc');
  });

  it('toggles an already active column from ascending to descending', () => {
    expect(nextSortDir('date', 'date', 'asc')).toBe('desc');
  });

  it('toggles an already active column from descending to ascending', () => {
    expect(nextSortDir('date', 'date', 'desc')).toBe('asc');
  });
});
