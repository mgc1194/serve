// manage-label/label-color-field.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { LabelColorField } from './label-color-field';

const meta: Meta<typeof LabelColorField> = {
  title: 'Households/LabelManagementDialog/LabelColorField',
  component: LabelColorField,
  parameters: { layout: 'padded' },
  args: {
    color: '#0052cc',
    disabled: false,
    onChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelColorField>;

export const Default: Story = {};

export const InvalidColor: Story = {
  args: { color: '#ZZZ' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const LightColor: Story = {
  args: { color: '#fef2c0' },
};
