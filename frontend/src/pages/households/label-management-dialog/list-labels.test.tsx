// pages/households/label-management-dialog/list-labels.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListLabels } from '@pages/households/label-management-dialog/list-labels';
import type { Label } from '@serve/types/global';

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof ListLabels>> = {}) {
  const onEdit = vi.fn();
  const onNewLabel = vi.fn();
  const onClose = vi.fn();

  render(
    <ListLabels
      labels={LABELS}
      isLoading={false}
      error={null}
      onEdit={onEdit}
      onNewLabel={onNewLabel}
      onClose={onClose}
      {...overrides}
    />,
  );

  return { onEdit, onNewLabel, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('ListLabels rendering', () => {
  it('renders a chip for each label', () => {
    setup();
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('renders an edit button for each label', () => {
    setup();
    expect(screen.getByRole('button', { name: /edit groceries/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit transport/i })).toBeDefined();
  });

  it('renders the New label button', () => {
    setup();
    expect(screen.getByRole('button', { name: /new label/i })).toBeDefined();
  });

  it('renders the Close button', () => {
    setup();
    expect(screen.getByRole('button', { name: /close/i })).toBeDefined();
  });

  it('shows empty message when no labels', () => {
    setup({ labels: [] });
    expect(screen.getByText(/no labels yet/i)).toBeDefined();
  });

  it('shows loading spinner when isLoading', () => {
    setup({ labels: [], isLoading: true });
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('shows error alert when error is set', () => {
    setup({ labels: [], error: 'Could not load labels. Please try again.' });
    expect(screen.getByText('Could not load labels. Please try again.')).toBeDefined();
  });
});

describe('ListLabels interactions', () => {
  it('calls onEdit with the label when the edit button is clicked', () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect(onEdit).toHaveBeenCalledWith(LABELS[0]);
  });

  it('calls onEdit with the correct label for each button', () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByRole('button', { name: /edit transport/i }));
    expect(onEdit).toHaveBeenCalledWith(LABELS[1]);
  });

  it('calls onNewLabel when New label is clicked', () => {
    const { onNewLabel } = setup();
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    expect(onNewLabel).toHaveBeenCalledOnce();
  });

  it('calls onClose when Close is clicked', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onEdit when the chip itself is clicked (chips are not interactive)', () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByText('Groceries'));
    expect(onEdit).not.toHaveBeenCalled();
  });
});
