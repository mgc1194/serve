// pages/budgets/budgets.test.tsx — Unit tests for the BudgetsPage shell.

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { BudgetsPage } from '@pages/budgets';

vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/budgets']}>
      <Routes>
        <Route path="/" element={<div>Dashboard page</div>} />
        <Route path="/budgets" element={<BudgetsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BudgetsPage', () => {
  it('renders the Budgets title', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeDefined();
  });

  it('navigates to the dashboard when Dashboard is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByText('Dashboard page')).toBeDefined();
  });
});
