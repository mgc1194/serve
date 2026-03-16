// pages/transactions/import-csv-dialog/account-selection.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AccountDetail } from '@serve/types/global';

import { AccountSelection } from './account-selection';

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

describe('AccountSelection', () => {
  it('renders the description text', () => {
    render(
      <AccountSelection
        accounts={ACCOUNTS}
        accountsLoading={false}
        accountsError={null}
        accountId=""
        setAccountId={vi.fn()}
      />,
    );
    expect(screen.getByText(/choose the account/i)).toBeDefined();
  });

  it('renders a spinner while loading', () => {
    render(
      <AccountSelection
        accounts={[]}
        accountsLoading={true}
        accountsError={null}
        accountId=""
        setAccountId={vi.fn()}
      />,
    );
    expect(document.querySelector('.MuiCircularProgress-root')).toBeDefined();
  });

  it('renders the error message when accountsError is set', () => {
    render(
      <AccountSelection
        accounts={[]}
        accountsLoading={false}
        accountsError="Could not load accounts."
        accountId=""
        setAccountId={vi.fn()}
      />,
    );
    expect(screen.getByText('Could not load accounts.')).toBeDefined();
  });

  it('renders all account options', () => {
    render(
      <AccountSelection
        accounts={ACCOUNTS}
        accountsLoading={false}
        accountsError={null}
        accountId=""
        setAccountId={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByText("Alice's 360 Savings")).toBeDefined();
    expect(screen.getByText("Bob's Checking")).toBeDefined();
  });

  it('calls setAccountId when an account is selected', () => {
    const setAccountId = vi.fn();
    render(
      <AccountSelection
        accounts={ACCOUNTS}
        accountsLoading={false}
        accountsError={null}
        accountId=""
        setAccountId={setAccountId}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    expect(setAccountId).toHaveBeenCalledWith(1);
  });

  it('disables the select when accounts is empty', () => {
    render(
      <AccountSelection
        accounts={[]}
        accountsLoading={false}
        accountsError={null}
        accountId=""
        setAccountId={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox').getAttribute('aria-disabled')).toBe('true');
  });
});
