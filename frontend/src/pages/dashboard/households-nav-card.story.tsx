import type { Meta, StoryObj } from '@storybook/react';

import { HouseholdsNavCard } from '@pages/dashboard/households-nav-card';

const meta: Meta<typeof HouseholdsNavCard> = {
  title: 'Dashboard/HouseholdsNavCard',
  component: HouseholdsNavCard,
  parameters: {
    layout: 'padded',
    router: true,
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdsNavCard>;

export const Default: Story = {};
