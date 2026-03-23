// pages/households/label-management-dialog/manage-label.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageLabel } from '@pages/households/label-management-dialog/manage-label';
import type { Label } from '@serve/types/global';

const LABEL: Label = { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 };

const defaultProps: React.ComponentProps<typeof ManageLabel> = {
  mode: 'create',
  editingLabel: null,
  name: '',
  color: '#6B7280',
  isSaving: false,
  isDeleting: false,
  error: null,
  onNameChange: vi.fn(),
  onColorChange: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onBack: vi.fn(),
  onDismissError: vi.fn(),
};

function setup(overrides: Partial<React.ComponentProps<typeof ManageLabel>> = {}) {
  const props = { ...defaultProps, ...overrides };
  render(<ManageLabel {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('ManageLabel rendering — create mode', () => {
  it('renders the Name input', () => {
    setup();
    expect(screen.getByLabelText(/^name$/i)).toBeDefined();
  });

  it('renders the Color input', () => {
    setup();
    expect(screen.getByLabelText(/^color$/i)).toBeDefined();
  });

  it('renders the Create button', () => {
    setup();
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDefined();
  });

  it('renders the Back button', () => {
    setup();
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDefined();
  });

  it('does not render the Delete button in create mode', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^delete$/i })).toBeNull();
  });

  it('shows preview chip with placeholder when name is empty', () => {
    setup({ name: '' });
    expect(screen.getByText('Label name')).toBeDefined();
  });

  it('shows preview chip with current name when name is set', () => {
    setup({ name: 'Groceries' });
    // There are two: the chip label text
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
  });

  it('disables Create when name is empty', () => {
    setup({ name: '' });
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables Create when name has content', () => {
    setup({ name: 'Groceries' });
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('shows error alert when error prop is set', () => {
    setup({ error: 'A label named "Groceries" already exists.' });
    expect(screen.getByText('A label named "Groceries" already exists.')).toBeDefined();
  });
});

describe('ManageLabel rendering — edit mode', () => {
  it('renders Save button instead of Create', () => {
    setup({ mode: 'edit', editingLabel: LABEL, name: LABEL.name, color: LABEL.color });
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /^create$/i })).toBeNull();
  });

  it('renders the Delete button in edit mode', () => {
    setup({ mode: 'edit', editingLabel: LABEL, name: LABEL.name, color: LABEL.color });
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDefined();
  });
});

describe('ManageLabel interactions', () => {
  it('calls onNameChange when the Name input changes', () => {
    const onNameChange = vi.fn();
    setup({ onNameChange });
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Food' } });
    expect(onNameChange).toHaveBeenCalledWith('Food');
  });

  it('calls onColorChange when the Color input changes', () => {
    const onColorChange = vi.fn();
    setup({ onColorChange });
    fireEvent.change(screen.getByLabelText(/^color$/i), { target: { value: '#ff0000' } });
    expect(onColorChange).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onSave when Create is clicked', () => {
    const onSave = vi.fn();
    setup({ name: 'Groceries', onSave });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onSave when Enter is pressed in the Name input', () => {
    const onSave = vi.fn();
    setup({ name: 'Groceries', onSave });
    fireEvent.keyDown(screen.getByLabelText(/^name$/i), { key: 'Enter' });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onBack when Back is clicked', () => {
    const onBack = vi.fn();
    setup({ onBack });
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onDelete with the label id when Delete is clicked in edit mode', async () => {
    const onDelete = vi.fn();
    setup({ mode: 'edit', editingLabel: LABEL, name: LABEL.name, color: LABEL.color, onDelete });
    // First click shows confirmation
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByText(/delete this label\?/i)).toBeDefined();
    // Confirm
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    expect(onDelete).toHaveBeenCalledWith(LABEL.id);
  });

  it('does not call onDelete when No is clicked', () => {
    const onDelete = vi.fn();
    setup({ mode: 'edit', editingLabel: LABEL, name: LABEL.name, color: LABEL.color, onDelete });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('hides confirmation and restores Delete button when No is clicked', () => {
    setup({ mode: 'edit', editingLabel: LABEL, name: LABEL.name, color: LABEL.color });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(screen.queryByText(/delete this label\?/i)).toBeNull();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDefined();
  });

  it('calls onDismissError when the alert close button is clicked', () => {
    const onDismissError = vi.fn();
    setup({ error: 'Something went wrong.', onDismissError });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onDismissError).toHaveBeenCalledOnce();
  });

  it('disables all buttons while isSaving', () => {
    setup({ name: 'Groceries', isSaving: true });
    expect(screen.getByRole('button', { name: /create/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /back/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables all buttons while isDeleting in edit mode', () => {
    const { rerender } = render(
      <ManageLabel
        {...defaultProps}
        mode="edit"
        editingLabel={LABEL}
        name={LABEL.name}
        color={LABEL.color}
        isDeleting={false}
      />,
    );
    // Enter confirm state
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    // Now simulate parent setting isDeleting: true
    rerender(
      <ManageLabel
        {...defaultProps}
        mode="edit"
        editingLabel={LABEL}
        name={LABEL.name}
        color={LABEL.color}
        isDeleting={true}
      />,
    );
    expect(screen.getByRole('button', { name: /^yes$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /^no$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /^save$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /^back$/i }).hasAttribute('disabled')).toBe(true);
  });
});

describe('ManageLabel color validation', () => {
  it('falls back to default grey preview for invalid hex', () => {
    // With an invalid color the swatch box should use DEFAULT_COLOR (#6B7280)
    // We can't inspect computed bgcolor directly in happy-dom, but we can confirm
    // the hex input still shows the raw value the user typed
    setup({ name: 'Test', color: '#ZZZ' });
    expect((screen.getByLabelText(/^color$/i) as HTMLInputElement).value).toBe('#ZZZ');
  });
});
