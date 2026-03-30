// manage-label/label-color-field.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelColorField } from './label-color-field';

const defaultProps = {
  color: '#0052cc',
  disabled: false,
  onChange: vi.fn(),
};

function setup(overrides: Partial<React.ComponentProps<typeof LabelColorField>> = {}) {
  const props = { ...defaultProps, ...overrides };
  render(<LabelColorField {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('LabelColorField rendering', () => {
  it('renders the color text input', () => {
    setup();
    expect(screen.getByLabelText(/^color$/i)).toBeDefined();
  });

  it('renders the native color picker swatch', () => {
    setup();
    expect(screen.getByLabelText(/choose label color/i)).toBeDefined();
  });

  it('does not show the picker popover initially', () => {
    setup();
    expect(screen.queryByText(/default colors/i)).toBeNull();
  });

  it('shows the picker popover when the text input is focused', () => {
    setup();
    fireEvent.focus(screen.getByLabelText(/^color$/i));
    expect(screen.getByText(/default colors/i)).toBeDefined();
  });

  it('does not show the picker popover when disabled', () => {
    setup({ disabled: true });
    fireEvent.focus(screen.getByLabelText(/^color$/i));
    expect(screen.queryByText(/default colors/i)).toBeNull();
  });
});

describe('LabelColorField interactions', () => {
  it('calls onChange when the text input changes', () => {
    const onChange = vi.fn();
    setup({ onChange });
    fireEvent.change(screen.getByLabelText(/^color$/i), { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onChange when a swatch is selected from the picker', () => {
    const onChange = vi.fn();
    setup({ onChange });
    fireEvent.focus(screen.getByLabelText(/^color$/i));
    fireEvent.mouseDown(screen.getByRole('button', { name: /navy/i }));
    expect(onChange).toHaveBeenCalledWith('#0052cc');
  });

  it('closes the picker after a swatch is selected', () => {
    setup();
    fireEvent.focus(screen.getByLabelText(/^color$/i));
    fireEvent.mouseDown(screen.getByRole('button', { name: /navy/i }));
    expect(screen.queryByText(/default colors/i)).toBeNull();
  });
});
