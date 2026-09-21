// components/switch-household-button/switch-household-button.story.tsx

import { Box, Typography } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { makeHousehold, makeUser } from '@serve/mocks';

const meta: Meta<typeof SwitchHouseholdButton> = {
  title: 'Components/SwitchHouseholdButton',
  component: SwitchHouseholdButton,
  parameters: {
    layout: 'padded',
    auth: {
      user: makeUser({
        households: [
          makeHousehold({ id: 1, name: 'Smith Household' }),
          makeHousehold({ id: 2, name: 'Johnson Household' }),
        ],
      }),
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwitchHouseholdButton>;

export const Default: Story = {};

// Icon-only trigger placed next to a real heading — used by pages (e.g.
// TransactionsPage) that already render the household name as their page
// title. The heading stays a real <h4> in the accessibility tree; this is a
// separate, clearly-labelled button rather than a restyled heading.
export const IconOnly: Story = {
  render: args => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="h4">Smith Household</Typography>
      <SwitchHouseholdButton {...args} iconOnly />
    </Box>
  ),
};
