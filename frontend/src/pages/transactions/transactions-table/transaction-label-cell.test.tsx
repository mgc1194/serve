// pages/transactions/transactions-table/transaction-label-cell.test.tsx

import { Table, TableBody } from '@mui/material';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Label, Transaction } from '@serve/types/global';
import * as transactionsService from '@services/transactions';

import { TransactionLabelCell } from './transaction-label-cell';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return { ...actual, updateTransactionLabel: vi.fn() };
});

const mockUpdateTransactionLabel = vi.mocked(transactionsService.updateTransactionLabel);

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: 'Food', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

const TX: Transaction = {
  id: 1,
  date: '2026-03-10',
  concept: 'TRADER JOES #123',
  amount: -42.57,
  label_id: 1,
  label_name: 'Groceries',
  label_color: '#16a34a',
  category: 'Food',
  additional_labels: null,
  exclude_from_summary: false,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

const TX_NO_LABEL: Transaction = {
  ...TX,
  label_id: null,
  label_name: null,
  label_color: null,
};

function setup(props: Partial<React.ComponentProps<typeof TransactionLabelCell>> = {}) {
  const onUpdated = vi.fn();
  const onError = vi.fn();
  const user = userEvent.setup();

  render(
    <Table>
      <TableBody>
        <tr>
          <TransactionLabelCell
            transaction={TX}
            labels={LABELS}
            onUpdated={onUpdated}
            onError={onError}
            {...props}
          />
        </tr>
      </TableBody>
    </Table>,
  );

  return { onUpdated, onError, user };
}

// Opens the Autocomplete dropdown and waits for the portal listbox to appear.
async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox'));
  return waitFor(() => within(document.body).getByRole('listbox'));
}

beforeEach(() => vi.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('TransactionLabelCell rendering', () => {
  it('renders the autocomplete input', () => {
    setup();
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('shows the selected label name in the input', () => {
    setup();
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Groceries');
  });

  it('shows empty input when no label is assigned', () => {
    setup({ transaction: TX_NO_LABEL });
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('');
  });

  it('renders the "No label" sentinel option when the dropdown is open', async () => {
    const { user } = setup();
    await openDropdown(user);
    expect(within(document.body).getByText('No label')).toBeDefined();
  });
});

// ── Clearing via "No label" sentinel ─────────────────────────────────────────

describe('TransactionLabelCell — clearing via No label option', () => {
  it('calls updateTransactionLabel with null when "No label" is selected', async () => {
    mockUpdateTransactionLabel.mockResolvedValueOnce(TX_NO_LABEL);
    const { user } = setup();

    await openDropdown(user);
    await user.click(within(document.body).getByText('No label'));

    await waitFor(() =>
      expect(mockUpdateTransactionLabel).toHaveBeenCalledWith(TX.id, null),
    );
  });

  it('calls onUpdated optimistically with label cleared when "No label" is selected', async () => {
    mockUpdateTransactionLabel.mockResolvedValueOnce(TX_NO_LABEL);
    const { user, onUpdated } = setup();

    await openDropdown(user);
    await user.click(within(document.body).getByText('No label'));

    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ label_id: null, label_name: null, label_color: null }),
    );
  });

  it('reverts optimistic update when API call fails', async () => {
    mockUpdateTransactionLabel.mockRejectedValueOnce(new Error('Server error'));
    const { user, onUpdated } = setup();

    await openDropdown(user);
    await user.click(within(document.body).getByText('No label'));

    await waitFor(() =>
      expect(onUpdated).toHaveBeenLastCalledWith(TX),
    );
  });
});

// ── Clearing via Enter on empty input ────────────────────────────────────────

describe('TransactionLabelCell — clearing via Enter on empty input', () => {
  it('calls updateTransactionLabel with null when Enter is pressed on empty input', async () => {
    mockUpdateTransactionLabel.mockResolvedValueOnce(TX_NO_LABEL);
    setup();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockUpdateTransactionLabel).toHaveBeenCalledWith(TX.id, null),
    );
  });

  it('does not call updateTransactionLabel when Enter is pressed with non-empty input', async () => {
    setup();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Groc' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockUpdateTransactionLabel).not.toHaveBeenCalled(),
    );
  });

  it('does not throw when Enter is pressed on an empty input', () => {
    setup();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '' } });
    expect(() => fireEvent.keyDown(input, { key: 'Enter' })).not.toThrow();
  });
});
