// pages/transactions/date-range-filter.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});

describe('DateRangeFilter interactions', () => {
  it('calls onDateFromChange with the typed date once it is complete', async () => {
    const { onDateFromChange } = setup();
    await userEvent.type(screen.getByLabelText('From'), '2026-02-01');
    expect(onDateFromChange).toHaveBeenLastCalledWith('2026-02-01');
  });

  it('calls onDateToChange with the typed date once it is complete', async () => {
    const { onDateToChange } = setup();
    await userEvent.type(screen.getByLabelText('To'), '2026-02-15');
    expect(onDateToChange).toHaveBeenLastCalledWith('2026-02-15');
  });

  it('calls onDateFromChange with undefined when cleared', async () => {
    const { onDateFromChange } = setup({ dateFrom: '2026-01-01' });
    await userEvent.clear(screen.getByLabelText('From'));
    expect(onDateFromChange).toHaveBeenLastCalledWith(undefined);
  });

  it('calls onDateToChange with undefined when cleared', async () => {
    const { onDateToChange } = setup({ dateTo: '2026-01-31' });
    await userEvent.clear(screen.getByLabelText('To'));
    expect(onDateToChange).toHaveBeenLastCalledWith(undefined);
  });

  // maxDate/minDate don't block typing an out-of-range date outright — they
  // mark the field invalid (the backend is still the source of truth for
  // rejecting an inverted range) rather than silently discarding keystrokes.
  it('marks "From" invalid when the typed date is after the current "To" value', async () => {
    setup({ dateTo: '2026-01-31' });
    const from = screen.getByLabelText('From');
    await userEvent.type(from, '2026-02-15');
    expect(from.getAttribute('aria-invalid')).toBe('true');
  });

  it('marks "To" invalid when the typed date is before the current "From" value', async () => {
    setup({ dateFrom: '2026-01-31' });
    const to = screen.getByLabelText('To');
    await userEvent.type(to, '2026-01-01');
    expect(to.getAttribute('aria-invalid')).toBe('true');
  });
});
