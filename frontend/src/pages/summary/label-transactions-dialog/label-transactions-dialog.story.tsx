// pages/summary/label-transactions-dialog/label-transactions-dialog.story.tsx
//
// The dialog fetches via listTransactions (GET /transactions/) rather than
// taking its results as a prop, so every story mocks that request via MSW
// instead of passing args — same pattern as household-categories-section's
// stories.

import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';

import { LabelTransactionsDialog } from '@pages/summary/label-transactions-dialog';
import { API_V1 } from '@serve/config';
import { makeTransaction } from '@serve/mocks';
import type { PaginatedTransactions, Transaction } from '@serve/types/global';

function handlersFor(page: Partial<PaginatedTransactions>) {
  const body: PaginatedTransactions = {
    results: [],
    count: 0,
    offset: 0,
    next_cursor: null,
    previous_cursor: null,
    sort: 'date',
    sort_dir: 'desc',
    ...page,
  };
  return [http.get(`${API_V1}/transactions/`, () => HttpResponse.json(body))];
}

const TRANSACTIONS: Transaction[] = [
  makeTransaction({
    id: 1,
    date: '2026-03-10',
    concept: 'TRADER JOES #123',
    amount: -42.57,
    account_name: "Alice's 360 Savings",
  }),
  makeTransaction({
    id: 2,
    date: '2026-03-18',
    concept: 'WHOLE FOODS MARKET',
    amount: -65.2,
    account_name: "Alice's 360 Savings",
  }),
];

const meta: Meta<typeof LabelTransactionsDialog> = {
  title: 'Summary/LabelTransactionsDialog',
  component: LabelTransactionsDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    householdId: 1,
    label: { label_id: 2, label_name: 'Groceries', label_color: '#16a34a' },
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
    monthLabel: 'March 2026',
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelTransactionsDialog>;

export const WithTransactions: Story = {
  parameters: { msw: handlersFor({ results: TRANSACTIONS, count: TRANSACTIONS.length }) },
};

export const Empty: Story = {
  parameters: { msw: handlersFor({}) },
};

export const MoreThanOnePage: Story = {
  parameters: { msw: handlersFor({ results: TRANSACTIONS, count: 50 }) },
};
