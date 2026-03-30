// components/delete-confirmation.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeleteConfirmation } from '@components/delete-confirmation';

const defaultProps = {
  isDeleting: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

function setup(overrides: Partial<React.ComponentProps<typeof DeleteConfirmation>> = {}) {
  const props = { ...defaultProps, ...overrides };
  render(<DeleteConfirmation {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('DeleteConfirmation rendering', () => {
  it('renders the default prompt when no prompt prop is provided', () => {
    setup();
    expect(screen.getByText('Delete?')).toBeDefined();
  });

  it('renders a custom prompt', () => {
    setup({ prompt: 'Delete this label?' });
    expect(screen.getByText('Delete this label?')).toBeDefined();
  });

  it('renders Yes and No buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: /^yes$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^no$/i })).toBeDefined();
  });

  it('disables both buttons while isDeleting', () => {
    setup({ isDeleting: true });
    expect(screen.getByRole('button', { name: /^yes$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /^no$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables both buttons when disabled prop is true', () => {
    setup({ disabled: true });
    expect(screen.getByRole('button', { name: /^yes$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /^no$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('shows a spinner on the Yes button while isDeleting', () => {
    setup({ isDeleting: true });
    expect(document.querySelector('.MuiCircularProgress-root')).not.toBeNull();
  });
});

describe('DeleteConfirmation interactions', () => {
  it('calls onConfirm when Yes is clicked', () => {
    const onConfirm = vi.fn();
    setup({ onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when No is clicked', () => {
    const onCancel = vi.fn();
    setup({ onCancel });
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when disabled', () => {
    const onConfirm = vi.fn();
    setup({ disabled: true, onConfirm });
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
