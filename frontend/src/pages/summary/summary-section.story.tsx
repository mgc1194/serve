// pages/summary/summary-section.story.tsx

import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { SummarySection } from '@pages/summary/summary-section';
import type { Summary } from '@serve/types/global';

const BASE_SUMMARY: Summary = {
  earnings: [
    {
      category_id: 1,
      category_name: 'Income',
      total: 3200.0,
      labels: [
        {
          label_id: 1,
          label_name: 'Paycheck',
          label_color: '#059669',
          category_id: 1,
          category_name: 'Income',
          total: 3200.0,
        },
      ],
    },
  ],
  spending: [
    {
      category_id: 2,
      category_name: 'Food',
      total: -420.57,
      labels: [
        {
          label_id: 2,
          label_name: 'Groceries',
          label_color: '#16a34a',
          category_id: 2,
          category_name: 'Food',
          total: -320.57,
        },
        {
          label_id: 3,
          label_name: 'Restaurants',
          label_color: '#ca8a04',
          category_id: 2,
          category_name: 'Food',
          total: -100.0,
        },
      ],
    },
    {
      category_id: 3,
      category_name: 'Transport',
      total: -180.0,
      labels: [
        {
          label_id: 4,
          label_name: 'Gas',
          label_color: '#2563eb',
          category_id: 3,
          category_name: 'Transport',
          total: -180.0,
        },
      ],
    },
    {
      category_id: null,
      category_name: '',
      total: -45.0,
      labels: [
        {
          label_id: 5,
          label_name: 'Miscellaneous',
          label_color: '#6B7280',
          category_id: null,
          category_name: '',
          total: -45.0,
        },
      ],
    },
  ],
  total: 2554.43,
  balance: 2554.43,
  uncategorised_total: 0,
  earliest_transaction_date: '2026-01-01',
};

// Wraps SummarySection with local tab state so reviewers can click between
// tabs in Storybook. Named with an uppercase letter so React hooks rules apply.
function InteractiveSummarySection(props: React.ComponentProps<typeof SummarySection>) {
  const [activeTab, setActiveTab] = useState<'spending' | 'earnings'>(props.activeTab);
  return <SummarySection {...props} activeTab={activeTab} onTabChange={setActiveTab} />;
}

const interactiveDecorator: Decorator = (_, context) => (
  <InteractiveSummarySection
    summary={context.args.summary as Summary}
    activeTab={(context.args.activeTab as 'spending' | 'earnings') ?? 'spending'}
    onTabChange={() => {}}
    monthLabel={(context.args.monthLabel as string) ?? ''}
    onLabelClick={() => {}}
  />
);

const meta: Meta<typeof SummarySection> = {
  title: 'Summary/SummarySection',
  component: SummarySection,
  decorators: [interactiveDecorator],
  parameters: { layout: 'padded' },
  args: {
    summary: BASE_SUMMARY,
    activeTab: 'spending',
    onTabChange: () => {},
    monthLabel: 'March 2026',
    onLabelClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SummarySection>;

export const SpendingTab: Story = {};

export const EarningsTab: Story = {
  args: { activeTab: 'earnings' },
};

export const EmptySpending: Story = {
  args: {
    summary: { ...BASE_SUMMARY, spending: [] },
    activeTab: 'spending',
  },
};

export const EmptyEarnings: Story = {
  args: {
    summary: { ...BASE_SUMMARY, earnings: [] },
    activeTab: 'earnings',
  },
};

export const SingleCategorySingleLabel: Story = {
  args: {
    summary: {
      ...BASE_SUMMARY,
      spending: [
        {
          category_id: 2,
          category_name: 'Food',
          total: -42.57,
          labels: [
            {
              label_id: 2,
              label_name: 'Groceries',
              label_color: '#16a34a',
              category_id: 2,
              category_name: 'Food',
              total: -42.57,
            },
          ],
        },
      ],
    },
  },
};

export const ManyLabels: Story = {
  args: {
    summary: {
      ...BASE_SUMMARY,
      spending: [
        {
          category_id: 2,
          category_name: 'Food',
          total: -950.0,
          labels: [
            {
              label_id: 2,
              label_name: 'Groceries',
              label_color: '#16a34a',
              category_id: 2,
              category_name: 'Food',
              total: -320.0,
            },
            {
              label_id: 3,
              label_name: 'Restaurants',
              label_color: '#ca8a04',
              category_id: 2,
              category_name: 'Food',
              total: -180.0,
            },
            {
              label_id: 6,
              label_name: 'Coffee',
              label_color: '#92400e',
              category_id: 2,
              category_name: 'Food',
              total: -95.0,
            },
            {
              label_id: 7,
              label_name: 'Takeout',
              label_color: '#dc2626',
              category_id: 2,
              category_name: 'Food',
              total: -210.0,
            },
            {
              label_id: 8,
              label_name: 'Snacks',
              label_color: '#d97706',
              category_id: 2,
              category_name: 'Food',
              total: -145.0,
            },
          ],
        },
      ],
    },
  },
};

export const UncategorisedOnly: Story = {
  args: {
    summary: {
      ...BASE_SUMMARY,
      spending: [
        {
          category_id: null,
          category_name: '',
          total: -200.0,
          labels: [
            {
              label_id: 5,
              label_name: 'Miscellaneous',
              label_color: '#6B7280',
              category_id: null,
              category_name: '',
              total: -120.0,
            },
            {
              label_id: 9,
              label_name: 'Other',
              label_color: '#9CA3AF',
              category_id: null,
              category_name: '',
              total: -80.0,
            },
          ],
        },
      ],
    },
  },
};
