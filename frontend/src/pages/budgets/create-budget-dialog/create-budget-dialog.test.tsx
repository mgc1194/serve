// pages/budgets/create-budget-dialog/create-budget-dialog.test.tsx
//
// Integration coverage for how the dialog wires its fields together (type
// switching, derived names, the create payload, error/loading states).
// Each field's own rendering and interaction details are covered in its
// own <field>.test.tsx.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateBudgetDialog } from '@pages/budgets/create-budget-dialog';
import { makeBudget } from '@serve/mocks';
import { createBudget, ApiError } from '@services/budgets';

vi.mock('@services/budgets', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/budgets')>();
  return { ...actual, createBudget: vi.fn() };
});

const mockCreateBudget = vi.mocked(createBudget);

function setup(overrides: Partial<React.ComponentProps<typeof CreateBudgetDialog>> = {}) {
  const onClose = vi.fn();
  const onCreate = vi.fn();
  render(
    <CreateBudgetDialog
      open
      householdId={1}
      onClose={onClose}
      onCreate={onCreate}
      {...overrides}
    />,
  );
  return { onClose, onCreate };
}

async function selectType(name: 'Monthly' | 'Period' | 'Project') {
  fireEvent.mouseDown(screen.getByLabelText(/^type$/i));
  fireEvent.click(await screen.findByRole('option', { name }));
}

beforeEach(() => vi.clearAllMocks());

describe('CreateBudgetDialog rendering', () => {
  it('defaults to Monthly, showing a month picker and no name field', () => {
    setup();
    expect(screen.getByLabelText('Month')).toBeDefined();
    expect(screen.queryByLabelText(/^name$/i)).toBeNull();
  });

  it('shows manual From/To pickers and no name field for Period', async () => {
    setup();
    await selectType('Period');
    expect(screen.getByLabelText('From')).toBeDefined();
    expect(screen.getByLabelText('To')).toBeDefined();
    expect(screen.queryByLabelText(/^name$/i)).toBeNull();
  });

  it('shows a Name field and no date inputs for Project', async () => {
    setup();
    await selectType('Project');
    expect(screen.getByLabelText(/^name$/i)).toBeDefined();
    expect(screen.queryByLabelText('Month')).toBeNull();
    expect(screen.queryByLabelText('From')).toBeNull();
  });

  it('disables Create until a month is picked for Monthly', () => {
    setup();
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });

  it('disables Create until a name is entered for Project', async () => {
    setup();
    await selectType('Project');
    expect(screen.getByRole('button', { name: /^create$/i }).hasAttribute('disabled')).toBe(true);
  });
});

describe('CreateBudgetDialog name derivation', () => {
  it('shows the derived "Month Year" name preview once a month is picked', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    expect(screen.getByText('Will be named "August 2026"')).toBeDefined();
  });

  it('shows a derived date-range name preview once a Period range is picked', async () => {
    setup();
    await selectType('Period');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-15' } });
    expect(screen.getByText('Will be named "Aug 15, 2026 – Sep 15, 2026"')).toBeDefined();
  });

  it('does not show a name preview for Project', async () => {
    setup();
    await selectType('Project');
    expect(screen.queryByText(/will be named/i)).toBeNull();
  });
});

describe('CreateBudgetDialog interactions', () => {
  it('calls createBudget with the derived "Month Year" name for Monthly', async () => {
    mockCreateBudget.mockResolvedValueOnce(makeBudget({ name: 'August 2026' }));
    setup();

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateBudget).toHaveBeenCalledWith({
        name: 'August 2026',
        type: 'period',
        household_id: 1,
        period_start: '2026-08-01',
        period_end: '2026-08-31',
      }),
    );
  });

  it('calls createBudget with the derived date-range name for Period', async () => {
    mockCreateBudget.mockResolvedValueOnce(makeBudget());
    setup();

    await selectType('Period');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-15' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateBudget).toHaveBeenCalledWith({
        name: 'Aug 15, 2026 – Sep 15, 2026',
        type: 'period',
        household_id: 1,
        period_start: '2026-08-15',
        period_end: '2026-09-15',
      }),
    );
  });

  it('calls createBudget with the entered name and no dates for Project', async () => {
    mockCreateBudget.mockResolvedValueOnce(makeBudget({ type: 'project' }));
    setup();

    await selectType('Project');
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Iceland Trip' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateBudget).toHaveBeenCalledWith({
        name: 'Iceland Trip',
        type: 'project',
        household_id: 1,
        period_start: undefined,
        period_end: undefined,
      }),
    );
  });

  it('calls onCreate with the created budget', async () => {
    const created = makeBudget({ id: 42, name: 'August 2026' });
    mockCreateBudget.mockResolvedValueOnce(created);
    const { onCreate } = setup();

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(created));
  });

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an error message when createBudget throws an ApiError', async () => {
    mockCreateBudget.mockRejectedValueOnce(
      new ApiError(400, 'A budget named "August 2026" already exists in this household.'),
    );
    setup();

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeDefined());
  });
});
