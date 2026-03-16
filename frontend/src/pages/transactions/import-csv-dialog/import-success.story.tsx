// pages/transactions/import-csv-dialog/import-success.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ImportSuccess } from '@pages/transactions/import-csv-dialog/import-success';

const meta: Meta<typeof ImportSuccess> = {
  title: 'Transactions/ImportCsvDialog/ImportSuccess',
  component: ImportSuccess,
  parameters: { layout: 'padded' },
  args: {
    result: {
      filename: 'transactions.csv',
      inserted: 5,
      skipped: 0,
      total: 5,
      error: null,
    },
  },
};

export default meta;
type Story = StoryObj<typeof ImportSuccess>;

export const Default: Story = {};

export const WithSkipped: Story = {
  args: {
    result: {
      filename: 'transactions.csv',
      inserted: 4,
      skipped: 2,
      total: 6,
      error: null,
    },
  },
};

export const SingleTransaction: Story = {
  args: {
    result: {
      filename: 'transactions.csv',
      inserted: 1,
      skipped: 0,
      total: 1,
      error: null,
    },
  },
};
