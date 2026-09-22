// components/switch-household-button/switch-household-button.story.tsx

import { Typography } from '@mui/material';
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

// Used as a page title (e.g. TransactionsPage): nest inside a real heading
// element rather than restyling the button to merely look like one, so the
// heading stays in the accessibility tree for screen-reader heading
// navigation. `font: 'inherit'` (not MUI's `typography` sx shorthand, which
// has no 'inherit' variant) makes the button's text match the heading.
export const AsPageTitle: Story = {
  render: args => (
    <Typography variant="h4">
      <SwitchHouseholdButton {...args} sx={{ font: 'inherit' }} />
    </Typography>
  ),
};
