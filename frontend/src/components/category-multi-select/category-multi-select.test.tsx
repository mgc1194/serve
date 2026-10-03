// components/category-multi-select/category-multi-select.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMultiSelect } from '@components/category-multi-select';
import { makeCategory } from '@serve/mocks';

const CATEGORIES = [
  makeCategory({ id: 1, name: 'Rent' }),
  makeCategory({ id: 2, name: 'Groceries' }),
];

describe('CategoryMultiSelect', () => {
  it('renders the label', () => {
    render(<CategoryMultiSelect categories={CATEGORIES} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^add categories$/i)).toBeDefined();
  });

  it('shows a checkbox option per category', async () => {
    render(<CategoryMultiSelect categories={CATEGORIES} selectedIds={[]} onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText(/^add categories$/i));
    expect(await screen.findByRole('option', { name: /rent/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /groceries/i })).toBeDefined();
  });

  it('calls onChange with the category added when an unchecked option is clicked', async () => {
    const onChange = vi.fn();
    render(<CategoryMultiSelect categories={CATEGORIES} selectedIds={[]} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByLabelText(/^add categories$/i));
    fireEvent.click(await screen.findByRole('option', { name: /rent/i }));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('calls onChange with the category removed when a checked option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <CategoryMultiSelect categories={CATEGORIES} selectedIds={[1, 2]} onChange={onChange} />,
    );
    fireEvent.mouseDown(screen.getByLabelText(/^add categories$/i));
    fireEvent.click(await screen.findByRole('option', { name: /rent/i }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('shows the selected category names joined together', () => {
    render(
      <CategoryMultiSelect categories={CATEGORIES} selectedIds={[1, 2]} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Rent, Groceries')).toBeDefined();
  });

  it('is disabled when there are no categories to choose from', () => {
    render(<CategoryMultiSelect categories={[]} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^add categories$/i).closest('.Mui-disabled')).not.toBeNull();
  });
});
