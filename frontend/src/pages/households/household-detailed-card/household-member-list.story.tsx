import type { Meta, StoryObj } from '@storybook/react';

import { HouseholdMemberList } from '@pages/households/household-detailed-card/household-member-list';

const meta: Meta<typeof HouseholdMemberList> = {
  title: 'Households/HouseholdMemberList',
  component: HouseholdMemberList,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof HouseholdMemberList>;

const MEMBERS = [
  { id: 1, first_name: 'Alice', last_name: 'Nguyen',  email: 'alice@example.com' },
  { id: 2, first_name: 'Bob',   last_name: 'Okafor',  email: 'bob@example.com'   },
  { id: 3, first_name: 'Carol', last_name: 'Santos',  email: 'carol@example.com' },
];

export const WithMembers: Story = {
  args: { members: MEMBERS },
};

export const SingleMember: Story = {
  args: { members: [MEMBERS[0]] },
};

export const Empty: Story = {
  args: { members: [] },
};
