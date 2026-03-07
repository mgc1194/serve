// pages/accounts/accounts-table.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { AccountsTable } from '@pages/accounts/accounts-table';
import type { AccountDetail } from '@serve/types/global';

const ACCOUNTS: AccountDetail[] = [
  {
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
  },
  {
    id: 2,
    name: "Bob's Checking",
    handler_key: 'sofi-checking',
    account_type_id: 2,
    account_type: 'SoFi Checking',
    bank_id: 2,
    bank_name: 'SoFi',
    household_id: 1,
    household_name: 'Smith Household',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 3,
    name: 'Joint Savings',
    handler_key: 'wf-savings',
    account_type_id: 3,
    account_type: 'Savings',
    bank_id: 3,
    bank_name: 'Wells Fargo',
    household_id: 2,
    household_name: 'Johnson Household',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
];

const meta: Meta<typeof AccountsTable> = {
  title: 'Accounts/AccountsTable',
  component: AccountsTable,
  parameters: { layout: 'padded' },
  args: {
    accounts: [],
    isLoading: false,
    error: null,
    onRetry: () => {},
    onUpdated: () => {},
    onDeleted: () => {},
    onAddAccount: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AccountsTable>;

export const Loading: Story = {
  args: { isLoading: true },
};

export const Error: Story = {
  args: { error: 'Could not load accounts. Please try again.' },
};

export const Empty: Story = {};

// Accounts spanning two households and three banks.
export const WithAccounts: Story = {
  args: { accounts: ACCOUNTS },
};

// Single account — no household column crowding.
export const SingleAccount: Story = {
  args: { accounts: [ACCOUNTS[0]] },
};
