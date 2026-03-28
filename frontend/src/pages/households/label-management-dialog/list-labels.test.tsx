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

  it('renders the keyboard hint (hidden until focused)', () => {
    setup();
    const hint = screen.getByText(/arrow keys to navigate/i);
    expect(hint).toBeDefined();
    expect(hint.getAttribute('data-focused')).toBe('false');
  });

  it('shows the keyboard hint when the listbox is focused', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const hint = screen.getByText(/arrow keys to navigate/i);
    fireEvent.focus(listbox);
    expect(hint.getAttribute('data-focused')).toBe('true');
  });

  it('hides the keyboard hint when the listbox loses focus', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const hint = screen.getByText(/arrow keys to navigate/i);
    fireEvent.focus(listbox);
    fireEvent.blur(listbox);
    expect(hint.getAttribute('data-focused')).toBe('false');
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

  it('does not render the keyboard hint when there are no labels', () => {
    setup({ labels: [] });
    expect(screen.queryByText(/arrow keys to navigate/i)).toBeNull();
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

// ── Listbox / keyboard navigation ─────────────────────────────────────────────

describe('ListLabels listbox keyboard navigation', () => {
  it('renders the chip list as a listbox', () => {
    setup();
    expect(screen.getByRole('listbox', { name: /labels/i })).toBeDefined();
  });

  it('the listbox is the single tab stop', () => {
    setup();
    expect(screen.getByRole('listbox', { name: /labels/i }).tabIndex).toBe(0);
  });

  it('all edit buttons have tabIndex -1', () => {
    setup();
    screen.getAllByRole('button', { name: /^edit/i }).forEach(btn => {
      expect(btn.tabIndex).toBe(-1);
    });
  });

  it('the first option is selected by default', () => {
    setup();
    const options = screen.getAllByRole('option');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowRight moves selection to the next option', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowLeft moves selection to the previous option', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'ArrowLeft' });
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowDown and ArrowUp also move selection', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('wraps from last to first on ArrowRight', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('wraps from first to last on ArrowLeft', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowLeft' });
    expect(options[2].getAttribute('aria-selected')).toBe('true');
  });

  it('Home moves selection to the first option', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End moves selection to the last option', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(options[2].getAttribute('aria-selected')).toBe('true');
  });

  it('Enter calls onEdit with the currently selected label', () => {
    const { onEdit } = setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith(LABELS[1]);
  });

  it('aria-activedescendant points to the selected option', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    fireEvent.focus(listbox);
    fireEvent.keyDown(listbox, { key: 'ArrowRight' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe(`label-option-${LABELS[1].id}`);
  });

  it('clears aria-activedescendant when listbox loses focus', () => {
    setup();
    const listbox = screen.getByRole('listbox', { name: /labels/i });
    fireEvent.focus(listbox);
    fireEvent.blur(listbox);
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('does not set isFocused when a descendant button receives focus via click', () => {
    setup();
    const hint = screen.getByText(/arrow keys to navigate/i);
    const editButton = screen.getByRole('button', { name: /edit groceries/i });
    // Simulate mouse click focusing the button — focus event bubbles to listbox
    // but target !== currentTarget so isFocused should stay false.
    fireEvent.focus(editButton);
    expect(hint.getAttribute('data-focused')).toBe('false');
  });

  it('clamps activeIndex when labels shrink', async () => {
    const { rerender } = render(
      <ListLabels
        labels={LABELS}
        isLoading={false}
        error={null}
        onEdit={vi.fn()}
        onNewLabel={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const listbox = screen.getByRole('listbox', { name: /labels/i });
    // Move to the last label
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(screen.getAllByRole('option')[2].getAttribute('aria-selected')).toBe('true');

    // Remove the last label — activeIndex should clamp to the new last
    rerender(
      <ListLabels
        labels={LABELS.slice(0, 2)}
        isLoading={false}
        error={null}
        onEdit={vi.fn()}
        onNewLabel={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    // activeIndex was 2, clamped to 1
    expect(options[1].getAttribute('aria-selected')).toBe('true');
  });
});
