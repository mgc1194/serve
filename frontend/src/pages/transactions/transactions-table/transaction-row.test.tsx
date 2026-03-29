// pages/transactions/transactions-table/transaction-row.test.tsx

import { Table, TableBody } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';
import type { Label, Transaction } from '@serve/types/global';
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
  };
});

const mockUpdateConcept = vi.mocked(transactionsService.updateTransactionConcept);
const mockDeleteTransaction = vi.mocked(transactionsService.deleteTransaction);

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: 'Food', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

const TX: Transaction = {
  id: 1,
  date: '2026-03-10',
  concept: 'TRADER JOES #123',
  amount: -42.57,
  label_id: null,
  label_name: null,
  label_color: null,
  category: 'Groceries',
  additional_labels: null,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

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
