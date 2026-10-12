// pages/summary/summary-section.test.tsx
//
// Regresses to a bug where this component read `row.category`, a field the
// backend never sends — SummarySchema (schemas/summary.py) exposes
// `category_id`/`category_name` since Label.category became an FK to
// budgets.Category (#260). `row.category` was always undefined, so every
// row silently fell back to the "Uncategorised" label regardless of its
// actual category.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummarySection } from '@pages/summary/summary-section';
import type { Summary } from '@serve/types/global';

function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    earnings: [],
    spending: [],
    total: 0,
    balance: 0,
    uncategorised_total: 0,
    earliest_transaction_date: null,
    ...overrides,
  };
}

function setup(summary: Summary, activeTab: 'spending' | 'earnings' = 'spending') {
  render(
    <SummarySection
      summary={summary}
      activeTab={activeTab}
      onTabChange={() => {}}
      monthLabel="March 2026"
    />,
  );
}

describe('SummarySection category names', () => {
  it("renders the category's actual name, not Uncategorised", () => {
    setup(
      makeSummary({
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
      }),
    );

    expect(screen.getByText('Food')).toBeDefined();
    expect(screen.queryByText('Uncategorised')).toBeNull();
  });

  it('renders Uncategorised only for the genuinely uncategorised bucket (category_id: null)', () => {
    setup(
      makeSummary({
        spending: [
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
      }),
    );

    expect(screen.getByText('Uncategorised')).toBeDefined();
  });

  it('renders multiple distinct category names side by side', () => {
    setup(
      makeSummary({
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
          {
            category_id: 3,
            category_name: 'Transport',
            total: -18.0,
            labels: [
              {
                label_id: 4,
                label_name: 'Gas',
                label_color: '#2563eb',
                category_id: 3,
                category_name: 'Transport',
                total: -18.0,
              },
            ],
          },
        ],
      }),
    );

    expect(screen.getByText('Food')).toBeDefined();
    expect(screen.getByText('Transport')).toBeDefined();
  });
});
