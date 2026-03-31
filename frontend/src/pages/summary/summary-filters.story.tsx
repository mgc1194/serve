// pages/summary/summary-filters.story.tsx

import type { Meta, StoryObj } from '@storybook/react';

import { SummaryFilters } from '@pages/summary/summary-filters';

const meta: Meta<typeof SummaryFilters> = {
  title: 'Summary/SummaryFilters',
  component: SummaryFilters,
  parameters: { layout: 'padded' },
  args: {
    households: [{ id: 1, name: 'Smith Household' }],
    householdId: 1,
    selectedYear: 2026,
    selectedMonth: 3,
    years: [2026, 2025, 2024],
    availableMonths: [1, 2, 3],
    onHouseholdChange: () => {},
    onYearChange: () => {},
    onMonthChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SummaryFilters>;

// Single household — household picker is hidden
export const SingleHousehold: Story = {};

// Multiple households — household picker is shown
export const MultipleHouseholds: Story = {
  args: {
    households: [
      { id: 1, name: 'Smith Household' },
      { id: 2, name: 'Johnson Household' },
    ],
    householdId: 2,
  },
};

// Mid-year: some months are disabled (future) and some are before earliest
export const MidYear: Story = {
  args: {
    selectedYear: 2025,
    selectedMonth: 6,
    years: [2026, 2025, 2024],
    availableMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
};

// Only current year available — happens when no historical data
export const CurrentYearOnly: Story = {
  args: {
    years: [2026],
    availableMonths: [1, 2, 3],
  },
};

// All months available — full past year
export const AllMonthsAvailable: Story = {
  args: {
    selectedYear: 2024,
    selectedMonth: 12,
    availableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
};
