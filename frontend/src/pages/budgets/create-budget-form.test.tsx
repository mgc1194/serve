// pages/budgets/create-budget-form.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBudgetForm } from '@pages/budgets/create-budget-form';
import { makeBudget } from '@serve/mocks';
import { createBudget, ApiError } from '@services/budgets';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return { ...actual, createBudget: vi.fn() };
});

const mockCreateBudget = vi.mocked(createBudget);

function setup() {
  const onCreate = vi.fn();
  render(<CreateBudgetForm householdId={1} onCreate={onCreate} />);
  return { onCreate };
}

beforeEach(() => vi.clearAllMocks());

describe('CreateBudgetForm rendering', () => {
  it('renders the name field, type select, and Create button', () => {
    setup();
    expect(screen.getByLabelText(/budget name/i)).toBeDefined();
    expect(screen.getByLabelText(/^type$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^create$/i })).toBeDefined();
  });

  it('defaults to spending, showing From/To date fields', () => {
    setup();
    expect(screen.getByLabelText('From')).toBeDefined();
    expect(screen.getByLabelText('To')).toBeDefined();
  });

  it('hides date fields when type is project', async () => {
    setup();
    fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Project' }));
    expect(screen.queryByLabelText('From')).toBeNull();
    expect(screen.queryByLabelText('To')).toBeNull();
  });

  it('disables Create when name is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables Create for a spending budget missing period dates', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/budget name/i), { target: { value: 'Test' } });
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables Create for a project budget with just a name', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/budget name/i), { target: { value: 'Trip' } });
    fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
    fireEvent.click(await screen.findByRole('option', { name: 'Project' }));
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(
      false,
    );
  });
});

describe('CreateBudgetForm interactions', () => {
  it('calls createBudget with name, type, and period dates', async () => {
    mockCreateBudget.mockResolvedValueOnce(makeBudget());
    setup();

    fireEvent.change(screen.getByLabelText(/budget name/i), {
      target: { value: 'January Budget' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateBudget).toHaveBeenCalledWith({
        name: 'January Budget',
        type: 'spending',
        household_id: 1,
        period_start: '2026-01-01',
        period_end: '2026-01-31',
      }),
    );
  });

  it('calls onCreate with the created budget', async () => {
    const created = makeBudget({ id: 42, name: 'January Budget' });
    mockCreateBudget.mockResolvedValueOnce(created);
    const { onCreate } = setup();

    fireEvent.change(screen.getByLabelText(/budget name/i), {
      target: { value: 'January Budget' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(created));
  });

  it('clears the form after a successful create', async () => {
    mockCreateBudget.mockResolvedValueOnce(makeBudget());
    setup();

    fireEvent.change(screen.getByLabelText(/budget name/i), {
      target: { value: 'January Budget' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect((screen.getByLabelText(/budget name/i) as HTMLInputElement).value).toBe(''),
    );
  });

  it('shows an error message when createBudget throws an ApiError', async () => {
    mockCreateBudget.mockRejectedValueOnce(
      new ApiError(400, 'A budget named "January Budget" already exists in this household.'),
    );
    setup();

    fireEvent.change(screen.getByLabelText(/budget name/i), {
      target: { value: 'January Budget' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeDefined());
  });
});
