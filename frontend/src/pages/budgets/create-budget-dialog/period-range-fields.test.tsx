// pages/budgets/create-budget-dialog/period-range-fields.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PeriodRangeFields } from '@pages/budgets/create-budget-dialog/period-range-fields';

describe('PeriodRangeFields', () => {
  it('renders From and To pickers', () => {
    render(
      <PeriodRangeFields
        periodStart={undefined}
        periodEnd={undefined}
        onChangeStart={vi.fn()}
        onChangeEnd={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('From')).toBeDefined();
    expect(screen.getByLabelText('To')).toBeDefined();
  });

  it('calls onChangeStart when From is picked', () => {
    const onChangeStart = vi.fn();
    render(
      <PeriodRangeFields
        periodStart={undefined}
        periodEnd={undefined}
        onChangeStart={onChangeStart}
        onChangeEnd={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });
    expect(onChangeStart).toHaveBeenCalledWith('2026-08-15');
  });

  it('calls onChangeEnd when To is picked', () => {
    const onChangeEnd = vi.fn();
    render(
      <PeriodRangeFields
        periodStart={undefined}
        periodEnd={undefined}
        onChangeStart={vi.fn()}
        onChangeEnd={onChangeEnd}
      />,
    );
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-15' } });
    expect(onChangeEnd).toHaveBeenCalledWith('2026-09-15');
  });
});
