// pages/transactions/import-csv-dialog/import-success.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImportSuccess } from './import-success';

describe('ImportSuccess', () => {
  it('renders the success heading', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 5, skipped: 0, total: 5, error: null }}
      />,
    );
    expect(screen.getByText('Import successful')).toBeDefined();
  });

  it('renders the inserted count and filename', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 5, skipped: 0, total: 5, error: null }}
      />,
    );
    expect(screen.getByText(/5 transactions imported/i)).toBeDefined();
    expect(screen.getByText(/transactions.csv/)).toBeDefined();
  });

  it('uses singular "transaction" when inserted is 1', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 1, skipped: 0, total: 1, error: null }}
      />,
    );
    expect(screen.getByText(/1 transaction imported/i)).toBeDefined();
  });

  it('renders the skipped count when skipped is greater than 0', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 4, skipped: 2, total: 6, error: null }}
      />,
    );
    expect(screen.getByText(/2 duplicates skipped/i)).toBeDefined();
  });

  it('uses singular "duplicate" when skipped is 1', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 4, skipped: 1, total: 5, error: null }}
      />,
    );
    expect(screen.getByText(/1 duplicate skipped/i)).toBeDefined();
  });

  it('does not render the skipped line when skipped is 0', () => {
    render(
      <ImportSuccess
        result={{ filename: 'transactions.csv', inserted: 5, skipped: 0, total: 5, error: null }}
      />,
    );
    expect(screen.queryByText(/skipped/i)).toBeNull();
  });
});
