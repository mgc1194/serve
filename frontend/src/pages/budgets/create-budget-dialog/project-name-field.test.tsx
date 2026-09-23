// pages/budgets/create-budget-dialog/project-name-field.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectNameField } from '@pages/budgets/create-budget-dialog/project-name-field';

describe('ProjectNameField', () => {
  it('renders the Name field with its current value', () => {
    render(<ProjectNameField value="Iceland Trip" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Iceland Trip');
  });

  it('calls onChange as the value is typed', () => {
    const onChange = vi.fn();
    render(<ProjectNameField value="" onChange={onChange} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Trip' } });
    expect(onChange).toHaveBeenCalledWith('Trip');
  });

  it('calls onSubmit when Enter is pressed', () => {
    const onSubmit = vi.fn();
    render(<ProjectNameField value="Trip" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText(/^name$/i), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not call onSubmit for other keys', () => {
    const onSubmit = vi.fn();
    render(<ProjectNameField value="Trip" onChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText(/^name$/i), { key: 'a' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
