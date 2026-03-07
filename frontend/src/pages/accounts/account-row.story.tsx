// pages/accounts/account-row.story.tsx
//
// AccountRow renders a TableRow, so every story wraps it in a minimal
// Table + TableBody via a decorator. Interactive states (editing, confirm
// delete) are shown by setting the initial open state through story args
// on wrapper components defined below, since the component manages those
// states internally.

import { Table, TableBody } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { AccountRow } from '@pages/accounts/account-row';
import type { AccountDetail } from '@serve/types/global';

// Wrap every story in a Table so TableRow / TableCell render correctly.
const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableBody>
      <Story />
    </TableBody>
  </Table>
);

const ACCOUNT: AccountDetail = {
  id: 1,
  name: "Alice's 360 Savings",
  handler_key: 'co-savings',
  account_type_id: 1,
  account_type: '360 Performance Savings',
  bank_id: 1,
  bank_name: 'Capital One',
  household_id: 1,
  household_name: 'Smith Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const meta: Meta<typeof AccountRow> = {
  title: 'Accounts/AccountRow',
  component: AccountRow,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
  args: {
    account: ACCOUNT,
    onUpdated: () => {},
    onDeleted: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AccountRow>;

// Default idle state: name, bank, type, household chip, edit + delete icons.
export const Default: Story = {};

// A different account to show a second household chip colour in context.
export const SecondHousehold: Story = {
  args: {
    account: {
      ...ACCOUNT,
      id: 2,
      name: "Bob's SoFi Checking",
      handler_key: 'sofi-checking',
      account_type: 'SoFi Checking',
      bank_name: 'SoFi',
      household_id: 2,
      household_name: 'Johnson Household',
    },
  },
};

// Long account name — verifies text doesn't overflow the cell.
export const LongName: Story = {
  args: {
    account: {
      ...ACCOUNT,
      name: "Mario & Luigi's Joint 360 Performance Savings Account",
    },
  },
};
