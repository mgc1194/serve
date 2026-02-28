import type { Meta, StoryObj } from '@storybook/react';

import { BrandFooter } from '@serve/components/brand-footer';

const meta: Meta<typeof BrandFooter> = {
  title: 'Components/BrandFooter',
  component: BrandFooter,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'navy',
      values: [{ name: 'navy', value: '#1e2235' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandFooter>;

export const Default: Story = {};
