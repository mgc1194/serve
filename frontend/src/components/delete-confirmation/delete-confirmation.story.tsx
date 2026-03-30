// components/delete-confirmation.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { DeleteConfirmation } from '@components/delete-confirmation';

const meta: Meta<typeof DeleteConfirmation> = {
  title: 'Components/DeleteConfirmation',
  component: DeleteConfirmation,
  parameters: { layout: 'padded' },
  args: {
    prompt: 'Delete?',
    isDeleting: false,
    disabled: false,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DeleteConfirmation>;

export const Default: Story = {};

export const CustomPrompt: Story = {
  args: { prompt: 'Delete this label?' },
};

export const Deleting: Story = {
  args: { isDeleting: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
