// pages/transactions/import-csv-dialog/account-selection.story.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { AccountSelection } from '@pages/transactions/import-csv-dialog/account-selection';
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
];

function AccountSelectionWithState(
  props: React.ComponentProps<typeof AccountSelection>,
) {
  const [accountId, setAccountId] = useState(props.accountId);
  return (
    <AccountSelection
      {...props}
      accountId={accountId}
      setAccountId={setAccountId}
    />
  );
}

const meta: Meta<typeof AccountSelection> = {
  title: 'Transactions/ImportCsvDialog/AccountSelection',
  component: AccountSelection,
  render: args => <AccountSelectionWithState {...args} />,
  parameters: { layout: 'padded' },
  args: {
    accounts: ACCOUNTS,
    accountsLoading: false,
    accountsError: null,
    accountId: '',
    setAccountId: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AccountSelection>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: { accountId: 1 },
};

export const NoAccounts: Story = {
  args: { accounts: [] },
};

export const Loading: Story = {
  args: { accountsLoading: true },
};

export const Error: Story = {
  args: { accountsError: 'Could not load accounts.' },
};
