// pages/transactions/transactions-table/transaction-row.story.tsx

import { Table, TableBody } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';
import { TransactionRow } from '@pages/transactions/transactions-table/transaction-row';
import type { Label, Transaction } from '@serve/types/global';

const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableBody>
      <Story />
    </TableBody>
  </Table>
);

const LABELS: Label[] = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: 'Food', household_id: 1 },
  { id: 2, name: 'Subscriptions', color: '#7c3aed', category: 'Entertainment', household_id: 1 },
  { id: 3, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
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
  exclude_from_summary: false,   // ← add this line
  source: 'csv',
  account_id: 1,
  account_name: "Alice's 360 Savings",
  bank_name: 'Capital One',
  imported_at: '2026-03-11T08:00:00Z',
};

const meta: Meta<typeof TransactionRow> = {
  title: 'Transactions/TransactionsTable/TransactionRow',
  component: TransactionRow,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
  args: {
    transaction: TX,
    columnOrder: DEFAULT_COLUMN_ORDER,
    labels: LABELS,
    onUpdated: () => {},
    onDeleted: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

// Default debit row — no label assigned
export const Debit: Story = {};

// Credit (positive amount)
export const Credit: Story = {
  args: {
    transaction: {
      ...TX,
      id: 2,
      concept: 'DIRECT DEPOSIT - EMPLOYER',
      amount: 2400.0,
      account_name: "Bob's Checking",
      bank_name: 'SoFi',
    },
  },
};

// Row with a label and category pre-assigned
export const WithLabel: Story = {
  args: {
    transaction: {
      ...TX,
      concept: 'NETFLIX.COM',
      amount: -15.49,
      label_id: 2,
      label_name: 'Subscriptions',
      label_color: '#7c3aed',
      category: 'Entertainment',
    },
  },
};

// Long concept — verifies text wraps cleanly
export const LongConcept: Story = {
  args: {
    transaction: {
      ...TX,
      concept: 'AMAZON MARKETPLACE AMZN.COM/BILL WA 98109 US ONLINE PURCHASE REFUND',
    },
  },
};

// No labels available in this household
export const NoLabels: Story = {
  args: { labels: [] },
};
