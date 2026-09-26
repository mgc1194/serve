// pages/budgets/create-budget-dialog/budget-type-field.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BudgetTypeField } from '@pages/budgets/create-budget-dialog/budget-type-field';

describe('BudgetTypeField', () => {
  it('renders the current value', () => {
    render(<BudgetTypeField value="period" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^type$/i).textContent).toBe('Period');
  });

  it('offers Monthly, Period, and Project options', async () => {
    render(<BudgetTypeField value="monthly" onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
    expect(await screen.findByRole('option', { name: 'Monthly' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Period' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Project' })).toBeDefined();
  });

  it('calls onChange with the selected type', async () => {
    const onChange = vi.fn();
    render(<BudgetTypeField value="monthly" onChange={onChange} />);
    fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Project' }));
    expect(onChange).toHaveBeenCalledWith('project');
  });

  it('disables the field when disabled is true', () => {
    render(<BudgetTypeField value="monthly" onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText(/^type$/i).closest('.Mui-disabled')).not.toBeNull();
  });
});
