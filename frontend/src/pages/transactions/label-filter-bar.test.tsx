// pages/transactions/label-filter-bar.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelFilterBar } from '@pages/transactions/label-filter-bar';
import { makeLabel } from '@serve/mocks';

const LABELS = [
  makeLabel({ id: 1, name: 'Groceries', color: '#22c55e' }),
  makeLabel({ id: 2, name: 'Rent', color: '#3b82f6' }),
];

function setup(props: Partial<React.ComponentProps<typeof LabelFilterBar>> = {}) {
  const onLabelChange = vi.fn();
  render(
    <LabelFilterBar
      labels={LABELS}
      labelId={undefined}
      onLabelChange={onLabelChange}
      {...props}
    />,
  );
  return { onLabelChange };
}

function openDropdown() {
  fireEvent.mouseDown(screen.getByRole('combobox'));
}

beforeEach(() => vi.clearAllMocks());

describe('LabelFilterBar rendering', () => {
  it('renders the filter input with a placeholder of "All labels"', () => {
    setup();
    expect(screen.getByPlaceholderText('All labels')).toBeDefined();
  });

  it('shows the selected label name as the input value', () => {
    setup({ labelId: 1 });
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Groceries');
  });

  it('lists "Unlabeled" plus every label when opened', () => {
    setup();
    openDropdown();
    expect(screen.getByText('Unlabeled')).toBeDefined();
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Rent')).toBeDefined();
  });

  it('renders with no labels gracefully, still offering "Unlabeled"', () => {
    setup({ labels: [] });
    openDropdown();
    expect(screen.getByText('Unlabeled')).toBeDefined();
  });
});

describe('LabelFilterBar interactions', () => {
  it('calls onLabelChange with the label id when a label option is chosen', () => {
    const { onLabelChange } = setup();
    openDropdown();
    fireEvent.click(screen.getByText('Groceries'));
    expect(onLabelChange).toHaveBeenCalledWith(1);
  });

  it('calls onLabelChange with -1 when "Unlabeled" is chosen', () => {
    const { onLabelChange } = setup();
    openDropdown();
    fireEvent.click(screen.getByText('Unlabeled'));
    expect(onLabelChange).toHaveBeenCalledWith(-1);
  });

  it('calls onLabelChange with undefined when the selection is cleared', () => {
    const { onLabelChange } = setup({ labelId: 1 });
    fireEvent.click(screen.getByTitle('Clear'));
    expect(onLabelChange).toHaveBeenCalledWith(undefined);
  });
});
