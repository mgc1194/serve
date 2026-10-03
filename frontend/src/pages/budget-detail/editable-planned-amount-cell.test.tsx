// pages/budget-detail/editable-planned-amount-cell.test.tsx

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditablePlannedAmountCell } from '@pages/budget-detail/editable-planned-amount-cell';

function setup(overrides: Partial<React.ComponentProps<typeof EditablePlannedAmountCell>> = {}) {
  const onSave = vi.fn();
  render(<EditablePlannedAmountCell value="100.00" onSave={onSave} {...overrides} />);
  return { onSave };
}

beforeEach(() => vi.clearAllMocks());

describe('EditablePlannedAmountCell rendering', () => {
  it('renders the current value', () => {
    setup();
    expect((screen.getByLabelText(/planned amount/i) as HTMLInputElement).value).toBe('100.00');
  });
});

describe('EditablePlannedAmountCell interactions', () => {
  it('calls onSave with the normalized value on blur when changed', () => {
    const { onSave } = setup();
    const input = screen.getByLabelText(/planned amount/i);
    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('250.00');
  });

  it('does not call onSave when the value is unchanged', () => {
    const { onSave } = setup();
    const input = screen.getByLabelText(/planned amount/i);
    fireEvent.change(input, { target: { value: '100.00' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reverts to the last valid value when left blank', () => {
    const { onSave } = setup();
    const input = screen.getByLabelText(/planned amount/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
    expect(input.value).toBe('100.00');
  });

  it('reverts to the last valid value when given non-numeric input', () => {
    const { onSave } = setup();
    const input = screen.getByLabelText(/planned amount/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
    expect(input.value).toBe('100.00');
  });

  it('saves on Enter key (blurs the input)', () => {
    const { onSave } = setup();
    const input = screen.getByLabelText(/planned amount/i) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '300' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('300.00');
  });

  it('resyncs the input when the value prop changes externally', () => {
    const { rerender } = render(
      <EditablePlannedAmountCell value="100.00" onSave={vi.fn()} />,
    );
    rerender(<EditablePlannedAmountCell value="200.00" onSave={vi.fn()} />);
    expect((screen.getByLabelText(/planned amount/i) as HTMLInputElement).value).toBe('200.00');
  });
});
