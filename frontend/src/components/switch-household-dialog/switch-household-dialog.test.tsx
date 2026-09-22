// components/switch-household-dialog/switch-household-dialog.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SwitchHouseholdDialog } from '@components/switch-household-dialog';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

function setup(overrides: Partial<React.ComponentProps<typeof SwitchHouseholdDialog>> = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <SwitchHouseholdDialog
      open
      households={HOUSEHOLDS}
      activeHouseholdId={1}
      onSelect={onSelect}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSelect, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('SwitchHouseholdDialog rendering', () => {
  it('renders a row for each household', () => {
    setup();
    expect(screen.getByText('Smith Household')).toBeDefined();
    expect(screen.getByText('Johnson Household')).toBeDefined();
  });

  it('does not render when closed', () => {
    setup({ open: false });
    expect(screen.queryByText('Smith Household')).toBeNull();
  });

  it('marks the active household as selected', () => {
    setup({ activeHouseholdId: 2 });
    expect(
      screen.getByText('Johnson Household').closest('.MuiListItemButton-root')?.className,
    ).toContain('Mui-selected');
  });

  it('exposes the active household to screen readers via aria-current', () => {
    setup({ activeHouseholdId: 2 });
    expect(
      screen.getByText('Johnson Household').closest('[role="button"]')?.getAttribute('aria-current'),
    ).toBe('true');
    expect(
      screen.getByText('Smith Household').closest('[role="button"]')?.getAttribute('aria-current'),
    ).toBeNull();
  });
});

describe('SwitchHouseholdDialog interactions', () => {
  it('calls onSelect with the clicked household', () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByText('Johnson Household'));
    expect(onSelect).toHaveBeenCalledWith(HOUSEHOLDS[1]);
  });
});
