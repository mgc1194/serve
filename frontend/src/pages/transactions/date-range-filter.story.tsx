// pages/transactions/date-range-filter.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { DateRangeFilter } from '@pages/transactions/date-range-filter';

const meta: Meta<typeof DateRangeFilter> = {
  title: 'Transactions/DateRangeFilter',
  component: DateRangeFilter,
  parameters: { layout: 'padded' },
  args: {
    dateFrom: undefined,
    dateTo: undefined,
    onDateFromChange: () => {},
    onDateToChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DateRangeFilter>;

export const Empty: Story = {};

export const RangeSelected: Story = {
  args: { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
};

export const OnlyFrom: Story = {
  args: { dateFrom: '2026-01-01' },
};

export const OnlyTo: Story = {
  args: { dateTo: '2026-01-31' },
};
