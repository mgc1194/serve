// pages/summary/label-transactions-dialog/label-transactions-dialog.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelTransactionsDialog } from '@pages/summary/label-transactions-dialog';
import { makeTransaction } from '@serve/mocks';
import type { PaginatedTransactions } from '@serve/types/global';
import { listTransactions, ApiError } from '@services/transactions';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return { ...actual, listTransactions: vi.fn() };
});

const mockListTransactions = vi.mocked(listTransactions);

const EMPTY_PAGE: PaginatedTransactions = {
  results: [],
  count: 0,
  offset: 0,
  next_cursor: null,
  previous_cursor: null,
  sort: 'date',
  sort_dir: 'desc',
};

const LABEL = { label_id: 2, label_name: 'Groceries', label_color: '#16a34a' };

function setup(overrides: Partial<React.ComponentProps<typeof LabelTransactionsDialog>> = {}) {
  const onClose = vi.fn();
  render(
    <LabelTransactionsDialog
      open
      onClose={onClose}
      householdId={1}
      label={LABEL}
      dateFrom="2026-03-01"
      dateTo="2026-03-31"
      monthLabel="March 2026"
      {...overrides}
    />,
  );
  return { onClose };
}

beforeEach(() => vi.clearAllMocks());

describe('LabelTransactionsDialog fetching', () => {
  it('fetches with the label, household, and month date range', async () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    setup();

    expect(mockListTransactions).toHaveBeenCalledWith({
      household_id: 1,
      label_id: 2,
      date_from: '2026-03-01',
      date_to: '2026-03-31',
    });
    await waitFor(() => expect(screen.getByText(/no transactions/i)).toBeDefined());
  });

  it('does not fetch when closed', () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    setup({ open: false });

    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no selected label', () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    setup({ label: null });

    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('shows a loading indicator while the request is in flight', () => {
    mockListTransactions.mockReturnValue(new Promise(() => {}));
    setup();

    expect(screen.getByRole('progressbar')).toBeDefined();
  });
});

describe('LabelTransactionsDialog results', () => {
  it('renders a row per transaction with date, concept, account, and amount', async () => {
    mockListTransactions.mockResolvedValue({
      ...EMPTY_PAGE,
      results: [
        makeTransaction({
          id: 1,
          date: '2026-03-10',
          concept: 'TRADER JOES #123',
          account_name: "Alice's 360 Savings",
          amount: -42.57,
        }),
      ],
      count: 1,
    });
    setup();

    await screen.findByText('TRADER JOES #123');
    expect(screen.getByText("Alice's 360 Savings")).toBeDefined();
    expect(screen.getByText('−$42.57')).toBeDefined();
  });

  it('shows a positive amount with a + prefix', async () => {
    mockListTransactions.mockResolvedValue({
      ...EMPTY_PAGE,
      results: [makeTransaction({ amount: 1200 })],
      count: 1,
    });
    setup();

    expect(await screen.findByText('+$1,200.00')).toBeDefined();
  });

  it('shows an empty-state message when there are no transactions', async () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    setup();

    await waitFor(() =>
      expect(screen.getByText(/no transactions for this label in march 2026/i)).toBeDefined(),
    );
  });

  it('shows a "showing first N of count" note when the first page is not everything', async () => {
    mockListTransactions.mockResolvedValue({
      ...EMPTY_PAGE,
      results: [makeTransaction()],
      count: 50,
    });
    setup();

    expect(await screen.findByText('Showing first 1 of 50 transactions.')).toBeDefined();
  });

  it('does not show the "showing first N" note when the first page has everything', async () => {
    mockListTransactions.mockResolvedValue({
      ...EMPTY_PAGE,
      results: [makeTransaction()],
      count: 1,
    });
    setup();

    await screen.findByText(makeTransaction().concept);
    expect(screen.queryByText(/showing first/i)).toBeNull();
  });

  it('shows an error message when the fetch fails', async () => {
    mockListTransactions.mockRejectedValue(new ApiError(500, 'Could not load transactions.'));
    setup();

    expect(await screen.findByText('Could not load transactions.')).toBeDefined();
  });
});

describe('LabelTransactionsDialog header', () => {
  it('shows the label name and month in the title', async () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    setup();

    await waitFor(() => expect(mockListTransactions).toHaveBeenCalled());
    const title = screen.getByRole('heading', { level: 2 });
    expect(title.textContent).toContain('Groceries');
    expect(title.textContent).toContain('March 2026');
  });

  it('calls onClose when the close button is clicked', async () => {
    mockListTransactions.mockResolvedValue(EMPTY_PAGE);
    const { onClose } = setup();

    fireEvent.click(await screen.findByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
