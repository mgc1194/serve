// pages/budgets/budget-card/budget-card.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BudgetCard } from '@pages/budgets/budget-card';
import { makeBudget } from '@serve/mocks';

describe('BudgetCard', () => {
  it('renders the budget name', () => {
    render(<BudgetCard budget={makeBudget({ name: 'January 2026' })} />);
    expect(screen.getByText('January 2026')).toBeDefined();
  });

  it('shows the Period type and date range for a period budget', () => {
    render(
      <BudgetCard
        budget={makeBudget({
          type: 'period',
          period_start: '2026-01-01',
          period_end: '2026-01-31',
        })}
      />,
    );
    expect(screen.getByText('Period')).toBeDefined();
    expect(screen.getByText('2026-01-01 – 2026-01-31')).toBeDefined();
  });

  it('shows "No fixed period" for a project budget', () => {
    render(
      <BudgetCard
        budget={makeBudget({ type: 'project', period_start: null, period_end: null })}
      />,
    );
    expect(screen.getByText('Project')).toBeDefined();
    expect(screen.getByText('No fixed period')).toBeDefined();
  });
});
