// manage-label/label-color-picker.story.tsx

import { Box } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { LabelColorPicker } from './label-color-picker';

// The picker is position:absolute so it needs a positioned parent
// with enough height to not be clipped.
const containerDecorator: Decorator = Story => (
  <Box sx={{ position: 'relative', height: 120 }}>
    <Story />
  </Box>
);

const meta: Meta<typeof LabelColorPicker> = {
  title: 'Households/LabelManagementDialog/LabelColorPicker',
  component: LabelColorPicker,
  decorators: [containerDecorator],
  parameters: { layout: 'padded' },
  args: {
    open: true,
    selectedColor: '#0052cc',
    onSelect: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof LabelColorPicker>;

export const Default: Story = {};

export const NoneSelected: Story = {
  args: { selectedColor: '' },
};

export const LightColorSelected: Story = {
  args: { selectedColor: '#fef2c0' },
};

export const Closed: Story = {
  args: { open: false },
};
