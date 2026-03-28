// pages/households/label-management-dialog/list-labels.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListLabels } from '@pages/households/label-management-dialog/list-labels';
import type { Label } from '@serve/types/global';

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
  { id: 3, name: 'Bills', color: '#dc2626', category: '', household_id: 1 },
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

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ListLabels rendering', () => {
  it('renders a chip for each label', () => {
    setup();
    expect(screen.getByText('Groceries')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
    expect(screen.getByText('Bills')).toBeDefined();
  });

  it('renders an edit button for each label', () => {
    setup();
    expect(screen.getByRole('button', { name: /edit groceries/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit transport/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit bills/i })).toBeDefined();
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

// ── Interactions ──────────────────────────────────────────────────────────────

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

  it('does not call onEdit when the chip itself is clicked', () => {
    const { onEdit } = setup();
    fireEvent.click(screen.getByText('Groceries'));
    expect(onEdit).not.toHaveBeenCalled();
  });
});

// ── Toolbar / keyboard navigation ─────────────────────────────────────────────

describe('ListLabels toolbar keyboard navigation', () => {
  it('renders the chip list as a toolbar', () => {
    setup();
    expect(screen.getByRole('toolbar', { name: /labels/i })).toBeDefined();
  });

  it('gives the first edit button tabIndex 0 and the rest -1', () => {
    setup();
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    expect(buttons[0].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);
    expect(buttons[2].tabIndex).toBe(-1);
  });

  it('moves focus to the next button on ArrowRight', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('moves focus to the previous button on ArrowLeft', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[1].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps from last to first on ArrowRight', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[2].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('wraps from first to last on ArrowLeft', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('moves focus to the first button on Home', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[2].focus();
    fireEvent.keyDown(toolbar, { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('moves focus to the last button on End', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(document.activeElement).toBe(buttons[2]);
  });

  it('also moves focus on ArrowDown and ArrowUp', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(toolbar, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('updates the active button tabIndex after keyboard navigation', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: /labels/i });
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    buttons[0].focus();
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(buttons[0].tabIndex).toBe(-1);
    expect(buttons[1].tabIndex).toBe(0);
  });

  it('updates the active button tabIndex after a click', () => {
    setup();
    const buttons = screen.getAllByRole('button', { name: /^edit/i });
    fireEvent.click(buttons[1]);
    expect(buttons[0].tabIndex).toBe(-1);
    expect(buttons[1].tabIndex).toBe(0);
  });
});
