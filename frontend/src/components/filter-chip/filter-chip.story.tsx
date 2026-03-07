// pages/accounts/filter-chip.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { FilterChip } from '@components/filter-chip';

const meta: Meta<typeof FilterChip> = {
  title: 'Components/FilterChip',
  component: FilterChip,
  parameters: { layout: 'centered' },
  args: {
    onClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

export const Inactive: Story = {
  args: {
    label: 'Inactive label',
    active: false,
  },
};

export const Active: Story = {
  args: {
    label: 'Active label',
    active: true,
  },
};

// onClear is provided and active=true, so the delete icon appears.
export const ActiveWithClear: Story = {
  args: {
    label: 'onClear label',
    active: true,
    onClear: () => {},
  },
};

// onClear is omitted — the "All" chip never shows a delete icon.
export const ActiveNoClear: Story = {
  args: {
    label: 'All labels',
    active: true,
    onClear: undefined,
  },
};
