import type { Meta, StoryObj } from '@storybook/react';

import { BrandPanel } from '@serve/components/brand-panel';

const meta: Meta<typeof BrandPanel> = {
  title: 'Components/BrandPanel',
  component: BrandPanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BrandPanel>;

export const Login: Story = {
  args: {
    tagline: (
      <>
        Your finances,<br /><em>clearly</em>.
      </>
    ),
  },
};

export const Register: Story = {
  args: {
    tagline: (
      <>
        Take control<br />of your <em>money</em>.
      </>
    ),
  },
};
