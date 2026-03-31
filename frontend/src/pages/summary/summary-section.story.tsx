// pages/summary/summary-section.story.tsx

import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { SummarySection } from '@pages/summary/summary-section';
import type { Summary } from '@serve/types/global';

const BASE_SUMMARY: Summary = {
  earnings: [
    {
      category: 'Income',
      total: 3200.00,
      labels: [
        { label_id: 1, label_name: 'Paycheck', label_color: '#059669', category: 'Income', total: 3200.00 },
      ],
    },
  ],
  spending: [
    {
      category: 'Food',
      total: -420.57,
      labels: [
        { label_id: 2, label_name: 'Groceries', label_color: '#16a34a', category: 'Food', total: -320.57 },
        { label_id: 3, label_name: 'Restaurants', label_color: '#ca8a04', category: 'Food', total: -100.00 },
      ],
    },
    {
      category: 'Transport',
      total: -180.00,
      labels: [
        { label_id: 4, label_name: 'Gas', label_color: '#2563eb', category: 'Transport', total: -180.00 },
      ],
    },
    {
      category: '',
      total: -45.00,
      labels: [
        { label_id: 5, label_name: 'Miscellaneous', label_color: '#6B7280', category: '', total: -45.00 },
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
          category: 'Food',
          total: -42.57,
          labels: [
            { label_id: 2, label_name: 'Groceries', label_color: '#16a34a', category: 'Food', total: -42.57 },
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
          category: 'Food',
          total: -950.00,
          labels: [
            { label_id: 2, label_name: 'Groceries', label_color: '#16a34a', category: 'Food', total: -320.00 },
            { label_id: 3, label_name: 'Restaurants', label_color: '#ca8a04', category: 'Food', total: -180.00 },
            { label_id: 6, label_name: 'Coffee', label_color: '#92400e', category: 'Food', total: -95.00 },
            { label_id: 7, label_name: 'Takeout', label_color: '#dc2626', category: 'Food', total: -210.00 },
            { label_id: 8, label_name: 'Snacks', label_color: '#d97706', category: 'Food', total: -145.00 },
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
          category: '',
          total: -200.00,
          labels: [
            { label_id: 5, label_name: 'Miscellaneous', label_color: '#6B7280', category: '', total: -120.00 },
            { label_id: 9, label_name: 'Other', label_color: '#9CA3AF', category: '', total: -80.00 },
          ],
        },
      ],
    },
  },
};
