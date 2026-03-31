import type { Meta, StoryObj } from '@storybook/react';

import { SummaryNavCard } from '@pages/dashboard/summary-nav-card';

const meta: Meta<typeof SummaryNavCard> = {
  title: 'Dashboard/SummaryNavCard',
  component: SummaryNavCard,
  parameters: {
    layout: 'padded',
    router: true,
  },
};

export default meta;
type Story = StoryObj<typeof SummaryNavCard>;

export const Default: Story = {};
