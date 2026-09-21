// pages/transactions/import-csv-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ImportCsvDialog } from '@pages/transactions/import-csv-dialog';
import { makeHousehold, makeUser } from '@serve/mocks';

const meta: Meta<typeof ImportCsvDialog> = {
  title: 'Transactions/ImportCsvDialog',
  component: ImportCsvDialog,
  parameters: {
    layout: 'centered',
    auth: { user: makeUser({ households: [makeHousehold()] }) },
  },
  args: {
    open: true,
    onImported: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ImportCsvDialog>;

// Step 0 — account selection, scoped to the session's active household
export const AccountSelection: Story = {};

// No household in session — nothing to import into yet
export const NoHousehold: Story = {
  parameters: { auth: { user: makeUser({ households: [] }) } },
};
