import type { Meta, StoryObj } from '@storybook/react';

import { BrandFooter } from '@components/brand-footer';

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
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#1e2235', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrandFooter>;

export const Default: Story = {};
