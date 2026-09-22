// pages/transactions/transactions-table/transaction-row.test.tsx

import { Table, TableBody } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';
import { makeLabel, makeTransaction } from '@serve/mocks';
import { ApiError } from '@services/transactions';
import * as transactionsService from '@services/transactions';

import { TransactionRow } from './transaction-row';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return {
    ...actual,
    updateTransactionConcept: vi.fn(),
    updateTransactionLabel: vi.fn(),
    deleteTransaction: vi.fn(),
    toggleTransactionExclusion: vi.fn(),
  };
});

const mockUpdateConcept = vi.mocked(transactionsService.updateTransactionConcept);
const mockDeleteTransaction = vi.mocked(transactionsService.deleteTransaction);

const LABELS = [
  makeLabel({ id: 1, name: 'Groceries', color: '#16a34a', category_id: null }),
  makeLabel({ id: 2, name: 'Transport', color: '#2563eb', category_id: null }),
];
 
const TX = makeTransaction({ category: 'Groceries' });

function setup(props: Partial<React.ComponentProps<typeof TransactionRow>> = {}) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();

  render(
    <Table>
      <TableBody>
        <TransactionRow
          transaction={TX}
          columnOrder={DEFAULT_COLUMN_ORDER}
          labels={LABELS}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          {...props}
        />
      </TableBody>
    </Table>,
  );

  return { onUpdated, onDeleted };
}

beforeEach(() => vi.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('TransactionRow rendering', () => {
  it('renders the concept', () => {
    setup();
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
  });

  it('renders the account name', () => {
    setup();
    expect(screen.getByText("Alice's 360 Savings")).toBeDefined();
  });

  it('renders a debit amount with minus sign', () => {
    setup();
    expect(screen.getByText(/−\$42\.57/)).toBeDefined();
  });

  it('renders a credit amount with plus sign', () => {
    setup({ transaction: { ...TX, amount: 2400.0 } });
    expect(screen.getByText(/\+\$2,400\.00/)).toBeDefined();
  });

  it('renders the category chip', () => {
    setup();
    expect(screen.getByText('Groceries')).toBeDefined();
  });

  it('renders — when category is null', () => {
    setup({ transaction: { ...TX, category: null } });
    expect(screen.getByText('—')).toBeDefined();
  });

  it('renders no extra dash for a budget category column when budgetCategoryMap is not provided', () => {
    // TX has a real (non-null) `category`, so the existing category column
    // never renders a dash either — any '—' present would have to come from
    // a Budget category column that shouldn't exist here.
    setup();
    expect(screen.queryAllByText('—')).toHaveLength(0);
  });
});

// ── Budget category column ────────────────────────────────────────────────────

describe('TransactionRow budget category column', () => {
  it('renders the budget category name when the row label maps to one', () => {
    setup({
      transaction: { ...TX, label_id: 1 },
      labels: [makeLabel({ id: 1, name: 'Groceries', category_id: 7 })],
      budgetCategoryMap: new Map([[7, 'Utilities']]),
    });
    expect(screen.getByText('Utilities')).toBeDefined();
  });

  it('renders a dash when the row has no label', () => {
    setup({
      transaction: { ...TX, label_id: null },
      budgetCategoryMap: new Map([[7, 'Utilities']]),
    });
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders a dash when the label\'s category is not in the selected budget', () => {
    setup({
      transaction: { ...TX, label_id: 1 },
      labels: [makeLabel({ id: 1, name: 'Groceries', category_id: 99 })],
      budgetCategoryMap: new Map([[7, 'Utilities']]),
    });
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});

// ── Inline concept edit ───────────────────────────────────────────────────────

describe('TransactionRow concept edit', () => {
  it('enters edit mode when the edit button is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('pre-fills the input with the current concept', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('TRADER JOES #123');
  });

  it('cancels edit mode on Cancel click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
  });

  it('cancels edit mode on Escape key', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('calls updateTransactionConcept and onUpdated on save', async () => {
    const updated = { ...TX, concept: 'WHOLE FOODS' };
    mockUpdateConcept.mockResolvedValueOnce(updated);
    const { onUpdated } = setup();

    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'WHOLE FOODS' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
    expect(mockUpdateConcept).toHaveBeenCalledWith(1, 'WHOLE FOODS');
  });

  it('saves on Enter key', async () => {
    const updated = { ...TX, concept: 'WHOLE FOODS' };
    mockUpdateConcept.mockResolvedValueOnce(updated);
    const { onUpdated } = setup();

    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'WHOLE FOODS' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  });

  it('shows an error row when save fails', async () => {
    mockUpdateConcept.mockRejectedValueOnce(new ApiError(400, 'Concept cannot be blank.'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Concept cannot be blank.')).toBeDefined());
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

describe('TransactionRow delete', () => {
  it('shows confirm prompt when delete is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /delete transaction/i }));
    expect(screen.getByText('Delete?')).toBeDefined();
  });

  it('cancels delete on No click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /delete transaction/i }));
    fireEvent.click(screen.getByRole('button', { name: /no/i }));
    expect(screen.queryByText('Delete?')).toBeNull();
  });

  it('calls deleteTransaction and onDeleted on Yes click', async () => {
    mockDeleteTransaction.mockResolvedValueOnce(undefined);
    const { onDeleted } = setup();

    fireEvent.click(screen.getByRole('button', { name: /delete transaction/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
    expect(mockDeleteTransaction).toHaveBeenCalledWith(1);
  });

  it('shows an error row when delete fails', async () => {
    mockDeleteTransaction.mockRejectedValueOnce(new ApiError(403, 'Not allowed.'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: /delete transaction/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => expect(screen.getByText('Not allowed.')).toBeDefined());
  });
});
