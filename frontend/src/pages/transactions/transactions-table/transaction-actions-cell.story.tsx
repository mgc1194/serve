// pages/transactions/transactions-table/transaction-actions-cell.story.tsx

import { Table, TableBody } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { TransactionActionsCell } from '@pages/transactions/transactions-table/transaction-actions-cell';
import type { Transaction } from '@serve/types/global';

const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableBody>
      <tr>
        <Story />
      </tr>
    </TableBody>
  </Table>
);

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

const meta: Meta<typeof TransactionActionsCell> = {
  title: 'Transactions/TransactionsTable/TransactionActionsCell',
  component: TransactionActionsCell,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
  args: {
    transaction: TX,
    onStartEditing: () => {},
    onUpdated: () => {},
    onDeleted: () => {},
    onError: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TransactionActionsCell>;

// Default — transaction included in summary
export const Included: Story = {};

// Transaction excluded from summary — eye-slash icon shown
export const Excluded: Story = {
  args: {
    transaction: { ...TX, exclude_from_summary: true },
  },
};
