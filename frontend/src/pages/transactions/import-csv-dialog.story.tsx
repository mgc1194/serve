// pages/transactions/import-csv-dialog.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { ImportCsvDialog } from '@pages/transactions/import-csv-dialog';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

const meta: Meta<typeof ImportCsvDialog> = {
  title: 'Transactions/ImportCsvDialog',
  component: ImportCsvDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    households: HOUSEHOLDS,
    onImported: () => {},
    onClose: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ImportCsvDialog>;

// Step 0 — household selection
export const HouseholdSelection: Story = {};

// No households available
export const NoHouseholds: Story = {
  args: { households: [] },
};
