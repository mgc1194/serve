// pages/transactions/transactions.test.tsx — Unit tests for the TransactionsPage
// refetch-after-import regression.
//
// Regresses to a bug where handleImported() reset URL search params to
// force a refetch, but on the default view (page 1, default sort, no
// cursor) that produced an identical URL, so the fetch effect never
// re-ran and imported transactions never appeared without a manual page
// refresh. This suite renders on the default URL, completes an import via
// a stubbed ImportCsvDialog, and asserts listTransactions is called again.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { TransactionsPage } from '@pages/transactions';
import type { FileImportResult, PaginatedTransactions } from '@serve/types/global';
import * as labelsService from '@services/labels';
import * as transactionsService from '@services/transactions';

vi.mock('@context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      username: 'test',
      households: [{ id: 1, name: 'Test Household' }],
    },
    setUser: vi.fn(),
  }),
}));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));

// ImportCsvDialog is a multi-step wizard (household/account selection, file
// upload) unrelated to this page's refetch behavior — stub it so the test
// can trigger onImported directly, as if a file finished uploading.
vi.mock('@pages/transactions/import-csv-dialog', () => ({
  ImportCsvDialog: ({
    open,
    onImported,
  }: {
    open: boolean;
    onImported: (result: FileImportResult) => void;
  }) =>
    open ? (
      <div role="dialog">
        <button
          type="button"
          onClick={() =>
            onImported({
              filename: 'transactions.csv',
              inserted: 3,
              skipped: 0,
              total: 3,
              error: null,
            })
          }
        >
          Complete import
        </button>
      </div>
    ) : null,
}));

const EMPTY_PAGE: PaginatedTransactions = {
  results: [],
  count: 0,
  offset: 0,
  next_cursor: null,
  previous_cursor: null,
  sort: 'date',
  sort_dir: 'desc',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ActiveHouseholdProvider>
        <TransactionsPage />
      </ActiveHouseholdProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(transactionsService, 'listTransactions').mockResolvedValue(EMPTY_PAGE);
  vi.spyOn(labelsService, 'listLabels').mockResolvedValue([]);
});

describe('TransactionsPage import refresh', () => {
  it('refetches transactions after a successful import on the default view', async () => {
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await userEvent.click(screen.getByRole('button', { name: /complete import/i }));

    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(2));
  });

  it('closes the import dialog after a successful import', async () => {
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await userEvent.click(screen.getByRole('button', { name: /complete import/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
