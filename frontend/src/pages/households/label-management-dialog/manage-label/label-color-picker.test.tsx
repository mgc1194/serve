// manage-label/label-color-picker.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelColorPicker } from './label-color-picker';

const defaultProps = {
  open: true,
  selectedColor: '#0052cc',
  onSelect: vi.fn(),
};

function setup(overrides: Partial<React.ComponentProps<typeof LabelColorPicker>> = {}) {
  const props = { ...defaultProps, ...overrides };
  render(<LabelColorPicker {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('LabelColorPicker rendering', () => {
  it('renders the default colors label', () => {
    setup();
    expect(screen.getByText(/default colors/i)).toBeDefined();
  });

  it('renders 16 color swatches', () => {
    setup();
    expect(screen.getAllByRole('button').length).toBe(16);
  });

  it('renders nothing when open is false', () => {
    setup({ open: false });
    expect(screen.queryByText(/default colors/i)).toBeNull();
  });
});

describe('LabelColorPicker interactions', () => {
  it('calls onSelect with the correct hex when a swatch is clicked', () => {
    const onSelect = vi.fn();
    setup({ onSelect });
    fireEvent.mouseDown(screen.getByRole('button', { name: /navy/i }));
    expect(onSelect).toHaveBeenCalledWith('#0052cc');
  });

  it('calls onSelect once per click', () => {
    const onSelect = vi.fn();
    setup({ onSelect });
    fireEvent.mouseDown(screen.getByRole('button', { name: /red/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
