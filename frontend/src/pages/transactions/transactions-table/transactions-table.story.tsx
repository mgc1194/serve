// pages/transactions/transactions-table/transactions-table.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { TransactionsTable } from '@pages/transactions/transactions-table';
import type { Label, Transaction } from '@serve/types/global';

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: 'Food', household_id: 1 },
  { id: 2, name: 'Subscriptions', color: '#7c3aed', category: 'Entertainment', household_id: 1 },
  { id: 3, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    date: '2026-03-10',
    concept: 'TRADER JOES #123',
    amount: -42.57,
    label_id: 1,
    label_name: 'Groceries',
    label_color: '#16a34a',
    category: 'Food',
    additional_labels: null,
    source: 'csv',
    account_id: 1,
    account_name: "Alice's 360 Savings",
    bank_name: 'Capital One',
    imported_at: '2026-03-11T08:00:00Z',
  },
  {
    id: 2,
    date: '2026-03-09',
    concept: 'DIRECT DEPOSIT - EMPLOYER',
    amount: 2400.0,
    label_id: null,
    label_name: null,
    label_color: null,
    category: null,
    additional_labels: null,
    source: 'csv',
    account_id: 2,
    account_name: "Bob's Checking",
    bank_name: 'SoFi',
    imported_at: '2026-03-11T08:00:00Z',
  },
  {
    id: 3,
    date: '2026-03-08',
    concept: 'NETFLIX.COM',
    amount: -15.49,
    label_id: 2,
    label_name: 'Subscriptions',
    label_color: '#7c3aed',
    category: 'Entertainment',
    additional_labels: null,
    source: 'csv',
    account_id: 2,
    account_name: "Bob's Checking",
    bank_name: 'SoFi',
    imported_at: '2026-03-11T08:00:00Z',
  },
  {
    id: 4,
    date: '2026-03-07',
    concept: 'UBER',
    amount: -18.00,
    label_id: 3,
    label_name: 'Transport',
    label_color: '#2563eb',
    category: null,
    additional_labels: null,
    source: 'csv',
    account_id: 1,
    account_name: "Alice's 360 Savings",
    bank_name: 'Capital One',
    imported_at: '2026-03-11T08:00:00Z',
  },
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

export const WithTransactions: Story = {
  args: { transactions: TRANSACTIONS },
};

export const NoLabels: Story = {
  args: { transactions: TRANSACTIONS, labels: [] },
};

// Single transaction — useful for checking row layout in isolation
export const SingleRow: Story = {
  args: { transactions: [TRANSACTIONS[0]] },
};
