// pages/transactions/transactions-table/transaction-actions-cell.test.tsx

import { Table, TableBody } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';
import { TransactionRow } from '@pages/transactions/transactions-table/transaction-row';
import type { Transaction } from '@serve/types/global';
import { ApiError } from '@services/transactions';
import * as transactionsService from '@services/transactions';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return {
    ...actual,
    toggleTransactionExclusion: vi.fn(),
    deleteTransaction: vi.fn(),
    updateTransactionConcept: vi.fn(),
    updateTransactionLabel: vi.fn(),
  };
});

const mockToggleExclusion = vi.mocked(transactionsService.toggleTransactionExclusion);

const TX: Transaction = {
  id: 1,
  date: '2026-03-10',
  concept: 'TRADER JOES #123',
  amount: -42.57,
  label_id: null,
  label_name: null,
  label_color: null,
  category: null,
  additional_labels: null,
  exclude_from_summary: false,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

function setup(overrides: Partial<Transaction> = {}) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();

  render(
    <Table>
      <TableBody>
        <TransactionRow
          transaction={{ ...TX, ...overrides }}
          columnOrder={DEFAULT_COLUMN_ORDER}
          labels={[]}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      </TableBody>
    </Table>,
  );

  return { onUpdated, onDeleted };
}

beforeEach(() => vi.clearAllMocks());

// ── Exclude from summary toggle ───────────────────────────────────────────────

describe('TransactionRow — exclude from summary toggle', () => {
  it('renders the exclude button when transaction is included', () => {
    setup();
    expect(screen.getByRole('button', { name: /exclude from summary/i })).toBeDefined();
  });

  it('renders the include button when transaction is excluded', () => {
    setup({ exclude_from_summary: true });
    expect(screen.getByRole('button', { name: /include in summary/i })).toBeDefined();
  });

  it('calls toggleTransactionExclusion with true when included transaction is toggled', async () => {
    mockToggleExclusion.mockResolvedValueOnce({ ...TX, exclude_from_summary: true });
    setup({ exclude_from_summary: false });

    fireEvent.click(screen.getByRole('button', { name: /exclude from summary/i }));

    await waitFor(() =>
      expect(mockToggleExclusion).toHaveBeenCalledWith(TX.id, true),
    );
  });

  it('calls toggleTransactionExclusion with false when excluded transaction is toggled', async () => {
    mockToggleExclusion.mockResolvedValueOnce({ ...TX, exclude_from_summary: false });
    setup({ exclude_from_summary: true });

    fireEvent.click(screen.getByRole('button', { name: /include in summary/i }));

    await waitFor(() =>
      expect(mockToggleExclusion).toHaveBeenCalledWith(TX.id, false),
    );
  });

  it('calls onUpdated with the returned transaction after toggle', async () => {
    const updated = { ...TX, exclude_from_summary: true };
    mockToggleExclusion.mockResolvedValueOnce(updated);
    const { onUpdated } = setup({ exclude_from_summary: false });

    fireEvent.click(screen.getByRole('button', { name: /exclude from summary/i }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  });

  it('surfaces an error via the row error when toggle fails', async () => {
    mockToggleExclusion.mockRejectedValueOnce(
      new ApiError(403, 'You are not a member of this household.'),
    );
    setup();

    fireEvent.click(screen.getByRole('button', { name: /exclude from summary/i }));

    await waitFor(() =>
      expect(screen.getByText('You are not a member of this household.')).toBeDefined(),
    );
  });

  it('surfaces a generic error message for non-ApiError failures', async () => {
    mockToggleExclusion.mockRejectedValueOnce(new Error('Network error'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: /exclude from summary/i }));

    await waitFor(() =>
      expect(screen.getByText('Could not update transaction.')).toBeDefined(),
    );
  });
});
