// pages/transactions/transactions-table/transactions-table.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { TransactionsTable } from '@pages/transactions/transactions-table';
import { makeLabel, makeTransaction } from '@serve/mocks';

const LABELS = [
  makeLabel({ id: 1, name: 'Groceries', color: '#16a34a', category: 'Food' }),
  makeLabel({ id: 2, name: 'Subscriptions', color: '#7c3aed', category: 'Entertainment' }),
  makeLabel({ id: 3, name: 'Transport', color: '#2563eb', category: '' }),
];

const TRANSACTIONS = [
  makeTransaction({
    id: 1,
    date: '2026-03-10',
    concept: 'TRADER JOES #123',
    amount: -42.57,
    label_id: 1,
    label_name: 'Groceries',
    label_color: '#16a34a',
    category: 'Food',
  }),
  makeTransaction({
    id: 2,
    date: '2026-03-09',
    concept: 'DIRECT DEPOSIT - EMPLOYER',
    amount: 2400.0,
    label_id: null,
    label_name: null,
    label_color: null,
    category: null,
    account_id: 2,
    account_name: "Seth's Checking",
    bank_name: 'SoFi',
  }),
  makeTransaction({
    id: 3,
    date: '2026-03-08',
    concept: 'NETFLIX.COM',
    amount: -15.49,
    label_id: 2,
    label_name: 'Subscriptions',
    label_color: '#7c3aed',
    category: 'Entertainment',
    account_id: 2,
    account_name: "Seth's Checking",
    bank_name: 'SoFi',
  }),
  makeTransaction({
    id: 4,
    date: '2026-03-07',
    concept: 'UBER',
    amount: -18.0,
    label_id: 3,
    label_name: 'Transport',
    label_color: '#2563eb',
    category: null,
    exclude_from_summary: true,
  }),
];

const meta: Meta<typeof TransactionsTable> = {
  title: 'Transactions/TransactionsTable',
  component: TransactionsTable,
  parameters: { layout: 'padded' },
  args: {
    transactions: [],
    labels: LABELS,
    isLoading: false,
    error: null,
    onRetry: () => {},
    onUpdated: () => {},
    onDeleted: () => {},
    onImport: () => {},
    count: 0,
    offset: 0,
    page: 1,
    pageSize: 20,
    nextCursor: null,
    previousCursor: null,
    onNextPage: () => {},
    onPreviousPage: () => {},
    sortKey: 'date',
    sortDir: 'desc',
    onSortChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TransactionsTable>;

export const Loading: Story = {
  args: { isLoading: true },
};

export const Error: Story = {
  args: { error: 'Could not load transactions. Please try again.' },
};

export const Empty: Story = {};

export const EmptyWithActiveFilter: Story = {
  args: { hasActiveFilter: true },
};

export const WithTransactions: Story = {
  args: { transactions: TRANSACTIONS, count: 4 },
};

export const NoLabels: Story = {
  args: { transactions: TRANSACTIONS, labels: [], count: 4 },
};

// Single transaction — useful for checking row layout in isolation
export const SingleRow: Story = {
  args: { transactions: [TRANSACTIONS[0]], count: 1 },
};

// Pagination controls active — shows enabled prev/next buttons
export const WithPagination: Story = {
  args: {
    transactions: TRANSACTIONS,
    count: 247,
    offset: 20,
    page: 2,
    nextCursor: 'eyJkYXRlIjoiMjAyNi0wMy0wNyIsImlkIjo0fQ==',
    previousCursor: 'eyJkYXRlIjoiMjAyNi0wMy0xMCIsImlkIjoxfQ==',
  },
};

// First page — previous disabled, next enabled
export const FirstPage: Story = {
  args: {
    transactions: TRANSACTIONS,
    count: 247,
    nextCursor: 'eyJkYXRlIjoiMjAyNi0wMy0wNyIsImlkIjo0fQ==',
    previousCursor: null,
  },
};

// Last page — previous enabled, next disabled
export const LastPage: Story = {
  args: {
    transactions: TRANSACTIONS,
    count: 247,
    nextCursor: null,
    previousCursor: 'eyJkYXRlIjoiMjAyNi0wMy0xMCIsImlkIjoxfQ==',
  },
};

// With an excluded transaction — shows the eye-slash icon on UBER row
export const WithExcludedRow: Story = {
  args: {
    transactions: TRANSACTIONS,
    count: 4,
  },
};
