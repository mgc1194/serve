// components/filter-chip.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterChip } from '@components/filter-chip';

function setup(props: Partial<React.ComponentProps<typeof FilterChip>> = {}) {
  const onClick = vi.fn();
  const onClear = vi.fn();
  render(
    <FilterChip
      label="Smith Household"
      active={false}
      onClick={onClick}
      onClear={onClear}
      {...props}
    />,
  );
  return { onClick, onClear };
}

beforeEach(() => vi.clearAllMocks());

describe('FilterChip rendering', () => {
  it('renders the label', () => {
    setup();
    expect(screen.getByText('Smith Household')).toBeDefined();
  });

  it('does not show delete icon when inactive', () => {
    setup({ active: false });
    // MUI renders the delete button with aria-label "Cancel" or as svg title
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('does not show delete icon when active but onClear is not provided', () => {
    setup({ active: true, onClear: undefined });
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('shows delete icon when active and onClear is provided', () => {
    setup({ active: true });
    // MUI Chip renders the delete action as a role="button" with aria-label containing "Cancel"
    expect(screen.getByTestId('CancelIcon')).toBeDefined();
  });
});

describe('FilterChip interactions', () => {
  it('calls onClick when the chip is clicked', () => {
    const { onClick } = setup();
    fireEvent.click(screen.getByText('Smith Household'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClear when the delete icon is clicked', () => {
    const { onClear } = setup({ active: true });
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not call onClear when inactive chip is clicked', () => {
    const { onClear } = setup({ active: false });
    fireEvent.click(screen.getByText('Smith Household'));
    expect(onClear).not.toHaveBeenCalled();
  });
});
