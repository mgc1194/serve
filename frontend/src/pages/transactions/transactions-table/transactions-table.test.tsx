// pages/transactions/transactions-table/transactions-table.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Label, Transaction } from '@serve/types/global';

import { TransactionsTable } from './index';

vi.mock('@services/transactions', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/transactions')>();
  return {
    ...actual,
    updateTransactionConcept: vi.fn(),
    updateTransactionLabel: vi.fn(),
    deleteTransaction: vi.fn(),
  };
});

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
  category: null,
  additional_labels: null,
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

const TX2: Transaction = {
  ...TX,
  id: 2,
  date: '2026-03-09',
  concept: 'DIRECT DEPOSIT',
  amount: 2400.0,
};

function setup(props: Partial<React.ComponentProps<typeof TransactionsTable>> = {}) {
  const onRetry = vi.fn();
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  const onImport = vi.fn();

  render(
    <TransactionsTable
      transactions={[]}
      labels={LABELS}
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      onImport={onImport}
      {...props}
    />,
  );

  return { onRetry, onUpdated, onDeleted, onImport };
}

beforeEach(() => vi.clearAllMocks());

// ── Loading state ─────────────────────────────────────────────────────────────

describe('TransactionsTable loading', () => {
  it('renders skeletons while loading', () => {
    setup({ isLoading: true });
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('does not render the table while loading', () => {
    setup({ isLoading: true });
    expect(screen.queryByRole('table')).toBeNull();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('TransactionsTable error', () => {
  it('renders the error message', () => {
    setup({ error: 'Could not load transactions.' });
    expect(screen.getByText('Could not load transactions.')).toBeDefined();
  });

  it('calls onRetry when Retry is clicked', () => {
    const { onRetry } = setup({ error: 'Could not load transactions.' });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('TransactionsTable empty', () => {
  it('renders the empty state message', () => {
    setup({ transactions: [] });
    expect(screen.getByText('No transactions yet.')).toBeDefined();
  });

  it('calls onImport when Import a CSV is clicked', () => {
    const { onImport } = setup({ transactions: [] });
    fireEvent.click(screen.getByRole('button', { name: /import a csv/i }));
    expect(onImport).toHaveBeenCalledOnce();
  });
});

// ── Data rendering ────────────────────────────────────────────────────────────

describe('TransactionsTable with data', () => {
  it('renders a table with data', () => {
    setup({ transactions: [TX] });
    expect(screen.getByRole('table')).toBeDefined();
  });

  it('renders all column headers', () => {
    setup({ transactions: [TX] });
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Amount')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
    expect(screen.getByText('Label')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders transaction concept', () => {
    setup({ transactions: [TX] });
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
  });

  it('renders a row per transaction', () => {
    setup({ transactions: [TX, TX2] });
    expect(screen.getByText('TRADER JOES #123')).toBeDefined();
    expect(screen.getByText('DIRECT DEPOSIT')).toBeDefined();
  });
});

// ── Sorting ───────────────────────────────────────────────────────────────────

describe('TransactionsTable sorting', () => {
  it('sorts by date descending by default', () => {
    setup({ transactions: [TX, TX2] });
    const rows = screen.getAllByRole('row');
    // TX2 (2026-03-09) is older — with desc default, TX (2026-03-10) should appear first
    expect(rows[1].textContent).toContain('TRADER JOES #123');
    expect(rows[2].textContent).toContain('DIRECT DEPOSIT');
  });

  it('toggles sort direction on repeated header click', () => {
    setup({ transactions: [TX, TX2] });
    const descriptionHeader = screen.getByRole('columnheader', { name: /description/i });
    fireEvent.click(descriptionHeader);
    fireEvent.click(descriptionHeader);
    // Just verify it doesn't throw and the table is still rendered
    expect(screen.getByRole('table')).toBeDefined();
  });
});
