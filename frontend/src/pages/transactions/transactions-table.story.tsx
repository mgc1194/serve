// pages/transactions/transactions-table.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { TransactionsTable } from '@pages/transactions/transactions-table';
import type { Transaction } from '@serve/types/global';

const TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    date: '2026-03-10',
    concept: 'TRADER JOES #123',
    amount: -42.57,
    label: null,
    category: null,
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
    label: null,
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
    label: 'Subscriptions',
    category: 'Entertainment',
    additional_labels: null,
    source: 'csv',
    account_id: 2,
    account_name: "Bob's Checking",
    bank_name: 'SoFi',
    imported_at: '2026-03-11T08:00:00Z',
  },
];

const meta: Meta<typeof TransactionsTable> = {
  title: 'Transactions/TransactionsTable',
  component: TransactionsTable,
  parameters: { layout: 'padded' },
  args: {
    transactions: [],
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

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = {
  args: { error: 'Could not load transactions. Please try again.' },
};

export const Empty: Story = {};

export const WithTransactions: Story = {
  args: { transactions: TRANSACTIONS },
};
