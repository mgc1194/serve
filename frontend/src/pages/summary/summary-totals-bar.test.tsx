// pages/summary/summary-totals-bar.test.tsx
//
// Regresses to a bug where Earnings was always rendered with a hardcoded
// "+" prefix and Spending with a hardcoded "−", both via Math.abs(value) —
// correct back when the sign of a label's total determined which bucket it
// landed in. Since api/v1/summary.py::get_summary now buckets a categorized
// label by its category's type instead of its own sign, a spending category
// can net positive (a refund, a deposit) and an earning category can net
// negative (a clawback) — the hardcoded prefixes would then show the wrong
// sign for the bucket's actual total.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummaryTotalsBar } from '@pages/summary/summary-totals-bar';
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

// Reads the rendered value next to a TotalItem's caption label (e.g.
// "Earnings" -> "+$2,500.00") rather than querying the value text directly,
// since two buckets can render an identical value (most notably "$0.00"
// when both default to zero).
function totalFor(label: string): string {
  return screen.getByText(label).parentElement!.querySelector('h6')!.textContent ?? '';
}

describe('SummaryTotalsBar signs', () => {
  it('shows + for a normal positive earnings total', () => {
    render(
      <SummaryTotalsBar
        summary={makeSummary({
          earnings: [{ category_id: 1, category_name: 'Job', total: 2500, labels: [] }],
        })}
      />,
    );
    expect(totalFor('Earnings')).toBe('+$2,500.00');
  });

  it('shows − for a normal negative spending total', () => {
    render(
      <SummaryTotalsBar
        summary={makeSummary({
          spending: [{ category_id: 2, category_name: 'Food', total: -320.57, labels: [] }],
        })}
      />,
    );
    expect(totalFor('Spending')).toBe('−$320.57');
  });

  // The reported bug: a spending category with a net-positive label (e.g. a
  // deposit filed under "Miscellaneous") must still show its real sign.
  it('shows + for a spending total that nets positive', () => {
    render(
      <SummaryTotalsBar
        summary={makeSummary({
          spending: [{ category_id: 3, category_name: 'Miscellaneous', total: 500, labels: [] }],
        })}
      />,
    );
    expect(totalFor('Spending')).toBe('+$500.00');
  });

  // Mirror case: an earning category with a net-negative label (e.g. a
  // clawback) must show its real sign too.
  it('shows − for an earnings total that nets negative', () => {
    render(
      <SummaryTotalsBar
        summary={makeSummary({
          earnings: [{ category_id: 4, category_name: 'Bonus', total: -100, labels: [] }],
        })}
      />,
    );
    expect(totalFor('Earnings')).toBe('−$100.00');
  });

  it('shows no sign for an exactly-zero earnings total', () => {
    render(
      <SummaryTotalsBar
        summary={makeSummary({
          earnings: [{ category_id: 5, category_name: 'Empty', total: 0, labels: [] }],
        })}
      />,
    );
    expect(totalFor('Earnings')).toBe('$0.00');
  });
});
