// pages/summary/summary-section.test.tsx
//
// Regresses to a bug where this component read `row.category`, a field the
// backend never sends — SummarySchema (schemas/summary.py) exposes
// `category_id`/`category_name` since Label.category became an FK to
// budgets.Category (#260). `row.category` was always undefined, so every
// row silently fell back to the "Uncategorised" label regardless of its
// actual category.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SummarySection } from '@pages/summary/summary-section';
import type { LabelSummary, Summary } from '@serve/types/global';

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

function setup(
  summary: Summary,
  activeTab: 'spending' | 'earnings' = 'spending',
  onLabelClick: (label: LabelSummary) => void = () => {},
) {
  render(
    <SummarySection
      summary={summary}
      activeTab={activeTab}
      onTabChange={() => {}}
      monthLabel="March 2026"
      onLabelClick={onLabelClick}
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

// Regresses to a bug where category/label totals were always rendered via
// Math.abs() with no sign at all, hiding whether a categorized total (whose
// sign no longer has to match its tab — see api/v1/summary.py::get_summary)
// was actually positive or negative.
describe('SummarySection signed totals', () => {
  it('shows + for a spending category that nets positive', () => {
    setup(
      makeSummary({
        spending: [
          {
            category_id: 3,
            category_name: 'Miscellaneous',
            total: 500,
            labels: [
              {
                label_id: 6,
                label_name: 'Deposits & Transfers',
                label_color: '#6B7280',
                category_id: 3,
                category_name: 'Miscellaneous',
                total: 500,
              },
            ],
          },
        ],
      }),
    );

    // Both the category header row and its single label row show the same
    // total here, by construction — assert there are two matches, not one.
    expect(screen.getAllByText('+$500.00')).toHaveLength(2);
  });

  it('shows − for an earnings category that nets negative', () => {
    setup(
      makeSummary({
        earnings: [
          {
            category_id: 4,
            category_name: 'Bonus',
            total: -100,
            labels: [
              {
                label_id: 7,
                label_name: 'Clawback',
                label_color: '#dc2626',
                category_id: 4,
                category_name: 'Bonus',
                total: -100,
              },
            ],
          },
        ],
      }),
      'earnings',
    );

    expect(screen.getAllByText('−$100.00')).toHaveLength(2);
  });

  it('still shows the expected sign for an ordinary spending category', () => {
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

    expect(screen.getAllByText('−$42.57')).toHaveLength(2);
  });
});

// Issue #338: clicking a label row should open the transactions-for-this-
// label modal; the category header row aggregates multiple labels and
// isn't clickable, since the backend filter only takes one label_id.
describe('SummarySection label row clicks', () => {
  const LABEL: LabelSummary = {
    label_id: 2,
    label_name: 'Groceries',
    label_color: '#16a34a',
    category_id: 2,
    category_name: 'Food',
    total: -42.57,
  };

  function summaryWithOneLabel(): Summary {
    return makeSummary({
      spending: [{ category_id: 2, category_name: 'Food', total: -42.57, labels: [LABEL] }],
    });
  }

  it('calls onLabelClick with the clicked label when its row is clicked', () => {
    const onLabelClick = vi.fn();
    setup(summaryWithOneLabel(), 'spending', onLabelClick);

    fireEvent.click(screen.getByText('Groceries'));

    expect(onLabelClick).toHaveBeenCalledWith(LABEL);
  });

  it('does not call onLabelClick when the category header row is clicked', () => {
    const onLabelClick = vi.fn();
    setup(summaryWithOneLabel(), 'spending', onLabelClick);

    fireEvent.click(screen.getByText('Food'));

    expect(onLabelClick).not.toHaveBeenCalled();
  });
});
