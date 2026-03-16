// pages/transactions/import-csv-dialog/household-selection.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HouseholdSelection } from './household-selection';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

describe('HouseholdSelection', () => {
  it('renders the description text', () => {
    render(
      <HouseholdSelection
        households={HOUSEHOLDS}
        householdId=""
        setHouseholdId={vi.fn()}
      />,
    );
    expect(screen.getByText(/choose the household/i)).toBeDefined();
  });

  it('renders all household options', () => {
    render(
      <HouseholdSelection
        households={HOUSEHOLDS}
        householdId=""
        setHouseholdId={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByText('Smith Household')).toBeDefined();
    expect(screen.getByText('Johnson Household')).toBeDefined();
  });

  it('calls setHouseholdId when a household is selected', () => {
    const setHouseholdId = vi.fn();
    render(
      <HouseholdSelection
        households={HOUSEHOLDS}
        householdId=""
        setHouseholdId={setHouseholdId}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    expect(setHouseholdId).toHaveBeenCalledWith(1);
  });

  it('disables the select when households is empty', () => {
    render(
      <HouseholdSelection
        households={[]}
        householdId=""
        setHouseholdId={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox').getAttribute('aria-disabled')).toBe('true');
  });
});
