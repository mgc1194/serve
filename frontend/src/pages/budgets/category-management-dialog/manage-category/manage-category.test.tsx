// pages/budgets/category-management-dialog/manage-category/manage-category.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ManageCategory } from '@pages/budgets/category-management-dialog/manage-category';
import type { Category, Label } from '@serve/types/global';

const CATEGORY: Category = {
  id: 1,
  name: 'Groceries',
  type: 'spending',
  is_active: true,
  household_id: 1,
};

const LABELS: Label[] = [
  { id: 1, name: 'Trader Joes', color: '#16a34a', category_id: 1, household_id: 1 },
  { id: 2, name: 'Whole Foods', color: '#2563eb', category_id: null, household_id: 1 },
];

const defaultProps: React.ComponentProps<typeof ManageCategory> = {
  mode: 'create',
  editingCategory: null,
  name: '',
  type: 'spending',
  labels: [],
  isSaving: false,
  isDeleting: false,
  error: null,
  onNameChange: vi.fn(),
  onTypeChange: vi.fn(),
  onSave: vi.fn(),
  onDeactivate: vi.fn(),
  onToggleLabel: vi.fn(),
  onBack: vi.fn(),
  onDismissError: vi.fn(),
};

function setup(overrides: Partial<React.ComponentProps<typeof ManageCategory>> = {}) {
  const props = { ...defaultProps, ...overrides };
  render(<ManageCategory {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('ManageCategory rendering — create mode', () => {
  it('renders the Name input', () => {
    setup();
    expect(screen.getByLabelText(/^name$/i)).toBeDefined();
  });

  it('renders the Type select, enabled', () => {
    setup();
    const select = screen.getByLabelText(/^type$/i);
    expect(select).toBeDefined();
    expect(select.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('renders the Create button', () => {
    setup();
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDefined();
  });

  it('renders the Back button', () => {
    setup();
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDefined();
  });

  it('does not render the Deactivate button in create mode', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^deactivate$/i })).toBeNull();
  });

  it('does not render the label checklist in create mode', () => {
    setup({ labels: LABELS });
    expect(screen.queryByText(/labels in this category/i)).toBeNull();
  });

  it('disables Create when name is empty', () => {
    setup({ name: '' });
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables Create when name has content', () => {
    setup({ name: 'Utilities' });
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('shows error alert when error prop is set', () => {
    setup({ error: 'A category named "Utilities" already exists.' });
    expect(screen.getByText('A category named "Utilities" already exists.')).toBeDefined();
  });
});

describe('ManageCategory rendering — edit mode', () => {
  it('renders Save button instead of Create', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name });
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /^create$/i })).toBeNull();
  });

  it('renders the Deactivate button in edit mode', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name });
    expect(screen.getByRole('button', { name: /^deactivate$/i })).toBeDefined();
  });

  it('disables the Type select in edit mode', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name });
    expect(screen.getByLabelText(/^type$/i).getAttribute('aria-disabled')).toBe('true');
  });

  it('renders the label checklist in edit mode', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name, labels: LABELS });
    expect(screen.getByText(/labels in this category/i)).toBeDefined();
    expect(screen.getByText('Trader Joes')).toBeDefined();
    expect(screen.getByText('Whole Foods')).toBeDefined();
  });

  it('checks labels already linked to this category', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name, labels: LABELS });
    expect(
      (screen.getByRole('checkbox', { name: /trader joes/i }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByRole('checkbox', { name: /whole foods/i }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('shows a message when the household has no labels', () => {
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name, labels: [] });
    expect(screen.getByText(/no labels in this household yet/i)).toBeDefined();
  });
});

describe('ManageCategory interactions', () => {
  it('calls onNameChange when the Name input changes', () => {
    const onNameChange = vi.fn();
    setup({ onNameChange });
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    expect(onNameChange).toHaveBeenCalledWith('Utilities');
  });

  it('calls onSave when Create is clicked', () => {
    const onSave = vi.fn();
    setup({ name: 'Utilities', onSave });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onSave when Enter is pressed in the Name input', () => {
    const onSave = vi.fn();
    setup({ name: 'Utilities', onSave });
    fireEvent.keyDown(screen.getByLabelText(/^name$/i), { key: 'Enter' });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onBack when Back is clicked', () => {
    const onBack = vi.fn();
    setup({ onBack });
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onDeactivate with the category id when Deactivate then Yes is clicked', () => {
    const onDeactivate = vi.fn();
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name, onDeactivate });
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    expect(screen.getByText(/deactivate this category\?/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    expect(onDeactivate).toHaveBeenCalledWith(CATEGORY.id);
  });

  it('does not call onDeactivate when No is clicked', () => {
    const onDeactivate = vi.fn();
    setup({ mode: 'edit', editingCategory: CATEGORY, name: CATEGORY.name, onDeactivate });
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(onDeactivate).not.toHaveBeenCalled();
  });

  it('calls onToggleLabel with the label id and checked=true when an unchecked label is clicked', () => {
    const onToggleLabel = vi.fn();
    setup({
      mode: 'edit',
      editingCategory: CATEGORY,
      name: CATEGORY.name,
      labels: LABELS,
      onToggleLabel,
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /whole foods/i }));
    expect(onToggleLabel).toHaveBeenCalledWith(2, true);
  });

  it('calls onToggleLabel with checked=false when an already-linked label is unchecked', () => {
    const onToggleLabel = vi.fn();
    setup({
      mode: 'edit',
      editingCategory: CATEGORY,
      name: CATEGORY.name,
      labels: LABELS,
      onToggleLabel,
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /trader joes/i }));
    expect(onToggleLabel).toHaveBeenCalledWith(1, false);
  });

  it('calls onDismissError when the alert close button is clicked', () => {
    const onDismissError = vi.fn();
    setup({ error: 'Something went wrong.', onDismissError });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onDismissError).toHaveBeenCalledOnce();
  });

  it('disables all buttons while isSaving', () => {
    setup({ name: 'Utilities', isSaving: true });
    expect(screen.getByRole('button', { name: /create/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /back/i }).hasAttribute('disabled')).toBe(true);
  });
});
