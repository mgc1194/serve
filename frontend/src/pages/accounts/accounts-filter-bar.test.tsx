// pages/accounts/accounts-filter-bar.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountsFilterBar } from '@pages/accounts/accounts-filter-bar';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

function setup(props: Partial<React.ComponentProps<typeof AccountsFilterBar>> = {}) {
  const onHouseholdChange = vi.fn();
  render(
    <AccountsFilterBar
      households={HOUSEHOLDS}
      householdId={undefined}
      onHouseholdChange={onHouseholdChange}
      {...props}
    />,
  );
  return { onHouseholdChange };
}

beforeEach(() => vi.clearAllMocks());

describe('AccountsFilterBar rendering', () => {
  it('renders the Filter label', () => {
    setup();
    expect(screen.getByText('Filter')).toBeDefined();
  });

  it('renders "All households" chip', () => {
    setup();
    expect(screen.getByText('All households')).toBeDefined();
  });

  it('renders a chip for each household', () => {
    setup();
    expect(screen.getByText('Smith Household')).toBeDefined();
    expect(screen.getByText('Johnson Household')).toBeDefined();
  });

  it('renders with no households gracefully', () => {
    setup({ households: [] });
    expect(screen.getByText('All households')).toBeDefined();
  });
});

describe('AccountsFilterBar interactions', () => {
  it('calls onHouseholdChange with the household id when a chip is clicked', () => {
    const { onHouseholdChange } = setup();
    fireEvent.click(screen.getByText('Smith Household'));
    expect(onHouseholdChange).toHaveBeenCalledWith(1);
  });

  it('calls onHouseholdChange with undefined when "All households" is clicked', () => {
    const { onHouseholdChange } = setup({ householdId: 1 });
    fireEvent.click(screen.getByText('All households'));
    expect(onHouseholdChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onHouseholdChange with undefined when the active chip clear icon is clicked', () => {
    const { onHouseholdChange } = setup({ householdId: 1 });
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(onHouseholdChange).toHaveBeenCalledWith(undefined);
  });
});
