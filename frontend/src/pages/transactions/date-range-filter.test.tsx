// pages/transactions/date-range-filter.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DateRangeFilter } from '@pages/transactions/date-range-filter';

function setup(props: Partial<React.ComponentProps<typeof DateRangeFilter>> = {}) {
  const onDateFromChange = vi.fn();
  const onDateToChange = vi.fn();
  render(
    <DateRangeFilter
      dateFrom={undefined}
      dateTo={undefined}
      onDateFromChange={onDateFromChange}
      onDateToChange={onDateToChange}
      {...props}
    />,
  );
  return { onDateFromChange, onDateToChange };
}

beforeEach(() => vi.clearAllMocks());

describe('DateRangeFilter rendering', () => {
  it('renders both "From" and "To" date fields', () => {
    setup();
    expect(screen.getByLabelText('From')).toBeDefined();
    expect(screen.getByLabelText('To')).toBeDefined();
  });

  it('shows the provided dateFrom and dateTo as field values', () => {
    setup({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2026-01-01');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2026-01-31');
  });

  it('clamps the "From" field max to the current "To" value', () => {
    setup({ dateTo: '2026-01-31' });
    expect((screen.getByLabelText('From') as HTMLInputElement).max).toBe('2026-01-31');
  });

  it('clamps the "To" field min to the current "From" value', () => {
    setup({ dateFrom: '2026-01-01' });
    expect((screen.getByLabelText('To') as HTMLInputElement).min).toBe('2026-01-01');
  });
});

describe('DateRangeFilter interactions', () => {
  it('calls onDateFromChange with the typed value', () => {
    const { onDateFromChange } = setup();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    expect(onDateFromChange).toHaveBeenCalledWith('2026-02-01');
  });

  it('calls onDateToChange with the typed value', () => {
    const { onDateToChange } = setup();
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-02-15' } });
    expect(onDateToChange).toHaveBeenCalledWith('2026-02-15');
  });

  it('calls onDateFromChange with undefined when cleared', () => {
    const { onDateFromChange } = setup({ dateFrom: '2026-01-01' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    expect(onDateFromChange).toHaveBeenCalledWith(undefined);
  });

  it('calls onDateToChange with undefined when cleared', () => {
    const { onDateToChange } = setup({ dateTo: '2026-01-31' });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '' } });
    expect(onDateToChange).toHaveBeenCalledWith(undefined);
  });
});
