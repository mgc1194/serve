import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import type { Meta, StoryObj } from '@storybook/react';

import { NavCard } from '@components/nav-card';

const meta: Meta<typeof NavCard> = {
  title: 'Components/NavCard',
  component: NavCard,
  parameters: { layout: 'padded' },
  args: { onClick: () => {} },
};

export default meta;
type Story = StoryObj<typeof NavCard>;

export const Default: Story = {
  args: {
    icon: <PeopleOutlineIcon />,
    title: 'Households',
    description: 'Manage households, members, and settings.',
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    icon: <AccountBalanceOutlinedIcon />,
    title: 'Accounts',
    description: 'View and manage your financial accounts.',
    disabled: true,
  },
};