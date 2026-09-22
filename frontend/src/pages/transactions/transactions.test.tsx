// pages/transactions/transactions.test.tsx — Unit tests for TransactionsPage's
// import-completion handling and label filter.
//
// Import refresh: regresses to a bug where handleImported() reset URL search
// params to force a refetch, but on the default view (page 1, default sort,
// no cursor) that produced an identical URL, so the fetch effect never
// re-ran and imported transactions never appeared without a manual page
// refresh. Also regresses to a bug where handleImported() closed the dialog
// immediately, hiding its own "Import successful" screen. This suite renders
// on the default URL, completes an import via a stubbed ImportCsvDialog, and
// asserts listTransactions is called again and the dialog stays open.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { TransactionsPage } from '@pages/transactions';
import { makeTransaction } from '@serve/mocks';
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
// can trigger onImported/onClose directly, as if a file finished uploading.
vi.mock('@pages/transactions/import-csv-dialog', () => ({
  ImportCsvDialog: ({
    open,
    onImported,
    onClose,
  }: {
    open: boolean;
    onImported: (result: FileImportResult) => void;
    onClose: () => void;
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
        <button type="button" onClick={onClose}>
          Close
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

const LABELS = [
  { id: 5, name: 'Groceries', color: '#22c55e', category: '', household_id: 1 },
];

const PAGE_WITH_A_ROW: PaginatedTransactions = {
  ...EMPTY_PAGE,
  results: [makeTransaction()],
  count: 1,
};

// Exposes the current URL query string (raw key order included) so tests
// can assert on it without reaching into router internals.
function LocationSearchProbe() {
  const [params] = useSearchParams();
  return <div data-testid="url-search">{params.toString()}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ActiveHouseholdProvider>
        <TransactionsPage />
      </ActiveHouseholdProvider>
      <LocationSearchProbe />
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

  it('keeps the import dialog open after a successful import, so its success screen is visible', async () => {
    // Regresses to a bug where handleImported() also closed the dialog, so
    // the dialog's own "Import successful" screen was hidden immediately —
    // the user had to reopen Import CSV to see it.
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await userEvent.click(screen.getByRole('button', { name: /complete import/i }));

    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('closes the import dialog only when the user closes it', async () => {
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await userEvent.click(screen.getByRole('button', { name: /complete import/i }));
    expect(screen.getByRole('dialog')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// Opens the label filter's Autocomplete dropdown and picks the given option.
// Clicks the option itself (not the label chip inside it, which has
// pointer-events: none and can't be the target of a realistic click).
async function pickLabelFilter(name: string) {
  await userEvent.click(screen.getByRole('combobox', { name: /filter by label/i }));
  await userEvent.click(await screen.findByRole('option', { name }));
}

describe('TransactionsPage label filter', () => {
  beforeEach(() => {
    vi.spyOn(labelsService, 'listLabels').mockResolvedValue(LABELS);
  });

  it('refetches with label_id when a label is picked from the filter', async () => {
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await pickLabelFilter('Groceries');

    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5 }),
      ),
    );
  });

  it('keeps the label filter active after changing the sort column', async () => {
    // A sortable column header only renders once there's at least one row.
    vi.spyOn(transactionsService, 'listTransactions').mockResolvedValue(PAGE_WITH_A_ROW);

    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await pickLabelFilter('Groceries');
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5 }),
      ),
    );

    // Re-order by a different column — the label filter must persist.
    await userEvent.click(screen.getByText('Account'));

    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5, sort: 'account' }),
      ),
    );
  });

  // Regression: buildParams() used to derive sort/sort_dir/page/label_id by
  // conditionally inserting each into a plain object in a fixed textual
  // order — but *whether* a given conditional fired (and so when its key
  // was first inserted) depended on the current state at call time. The
  // very first click on a new column (sort/sort_dir still at their
  // defaults) put label_id first, since only its condition passed before
  // the override loop added sort/sort_dir; toggling that same column's
  // direction again (sort/sort_dir now non-default) made their conditions
  // pass first instead, pushing label_id to the end. Harmless functionally
  // (URLSearchParams doesn't care about order), but the URL shouldn't
  // reshuffle itself depending on interaction history.
  it('keeps the URL param order stable across interactions that touch different params', async () => {
    vi.spyOn(transactionsService, 'listTransactions').mockResolvedValue(PAGE_WITH_A_ROW);

    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await pickLabelFilter('Groceries');
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5 }),
      ),
    );

    // First click on "Account": a new column, so sort_dir defaults to 'asc'.
    await userEvent.click(screen.getByText('Account'));
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5, sort: 'account', sort_dir: 'asc' }),
      ),
    );
    const ascendingKeys = screen
      .getByTestId('url-search')
      .textContent!.split('&')
      .map(pair => pair.split('=')[0]);

    // Second click on the same column toggles to descending.
    await userEvent.click(screen.getByText('Account'));
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5, sort: 'account', sort_dir: 'desc' }),
      ),
    );
    const descendingKeys = screen
      .getByTestId('url-search')
      .textContent!.split('&')
      .map(pair => pair.split('=')[0]);

    expect(descendingKeys).toEqual(ascendingKeys);
  });
});
