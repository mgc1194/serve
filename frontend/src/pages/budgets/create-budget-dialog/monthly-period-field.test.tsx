// pages/budgets/create-budget-dialog/monthly-period-field.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MonthlyPeriodField } from '@pages/budgets/create-budget-dialog/monthly-period-field';

describe('MonthlyPeriodField', () => {
  it('renders the Month picker', () => {
    render(<MonthlyPeriodField periodStart={undefined} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Month')).toBeDefined();
  });

  it('calls onChange with the start and end of the picked month', () => {
    const onChange = vi.fn();
    render(<MonthlyPeriodField periodStart={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-02' } });
    expect(onChange).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
  });

  it('calls onChange with undefined for both dates when cleared', () => {
    const onChange = vi.fn();
    render(<MonthlyPeriodField periodStart="2026-02-01" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined, undefined);
  });
});
