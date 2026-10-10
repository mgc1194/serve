// pages/transactions/transactions-table/transaction-row.story.tsx

import { Table, TableBody } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { DEFAULT_COLUMN_ORDER } from '@pages/transactions/transactions-table/columns';
import { TransactionRow } from '@pages/transactions/transactions-table/transaction-row';
import { makeLabel, makeTransaction } from '@serve/mocks';

const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableBody>
      <Story />
    </TableBody>
  </Table>
);

const LABELS = [
  makeLabel({ id: 1, name: 'Groceries', color: '#16a34a', category: 'Food' }),
  makeLabel({ id: 2, name: 'Subscriptions', color: '#7c3aed', category: 'Entertainment' }),
  makeLabel({ id: 3, name: 'Transport', color: '#2563eb', category: '' }),
];

const meta: Meta<typeof TransactionRow> = {
  title: 'Transactions/TransactionsTable/TransactionRow',
  component: TransactionRow,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
  args: {
    transaction: makeTransaction(),
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
    transaction: makeTransaction({
      id: 2,
      concept: 'DIRECT DEPOSIT - EMPLOYER',
      amount: 2400.0,
      account_name: "Seth's Checking",
      bank_name: 'SoFi',
    }),
  },
};

// Row with a label and category pre-assigned
export const WithLabel: Story = {
  args: {
    transaction: makeTransaction({
      concept: 'NETFLIX.COM',
      amount: -15.49,
      label_id: 2,
      label_name: 'Subscriptions',
      label_color: '#7c3aed',
      category: 'Entertainment',
    }),
  },
};

// Long concept — verifies text wraps cleanly
export const LongConcept: Story = {
  args: {
    transaction: makeTransaction({
      concept: 'AMAZON MARKETPLACE AMZN.COM/BILL WA 98109 US ONLINE PURCHASE REFUND',
    }),
  },
};

// No labels available in this household
export const NoLabels: Story = {
  args: { labels: [] },
};