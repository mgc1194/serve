// pages/transactions/import-csv-dialog/household-selection.story.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { HouseholdSelection } from './household-selection';

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

function HouseholdSelectionWithState(
  props: React.ComponentProps<typeof HouseholdSelection>,
) {
  const [householdId, setHouseholdId] = useState(props.householdId);
  return (
    <HouseholdSelection
      {...props}
      householdId={householdId}
      setHouseholdId={setHouseholdId}
    />
  );
}

const meta: Meta<typeof HouseholdSelection> = {
  title: 'Transactions/ImportCsvDialog/HouseholdSelection',
  component: HouseholdSelection,
  render: (args) => <HouseholdSelectionWithState {...args} />,
  parameters: { layout: 'padded' },
  args: {
    households: HOUSEHOLDS,
    householdId: '',
    setHouseholdId: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdSelection>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: { householdId: 1 },
};

export const NoHouseholds: Story = {
  args: { households: [] },
};
