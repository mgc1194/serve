import type { Meta, StoryObj } from '@storybook/react';

import { ProjectNameField } from '@pages/budgets/create-budget-dialog/project-name-field';

const meta: Meta<typeof ProjectNameField> = {
  title: 'Budgets/CreateBudgetDialog/ProjectNameField',
  component: ProjectNameField,
  parameters: { layout: 'padded' },
  args: {
    value: '',
    onChange: () => {},
    onSubmit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ProjectNameField>;

export const Empty: Story = {};

export const WithValue: Story = {
  args: { value: 'Iceland Trip' },
};
