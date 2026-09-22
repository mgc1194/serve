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

import { render, screen, waitFor, within } from '@testing-library/react';
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

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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

  // Regression: with an active label filter, handleUpdated() always patched
  // the edited transaction in place, even when the edit moved it out of the
  // filter (e.g. assigning a label to a row while filtered to "Unlabeled").
  // The now-non-matching row stayed visible and count/pagination went stale
  // until a manual reload.
  it('refetches when a label edit moves a transaction out of the active "Unlabeled" filter', async () => {
    const unlabelledTx = makeTransaction({
      id: 42,
      concept: 'CORNER STORE',
      label_id: null,
      label_name: null,
      label_color: null,
    });
    vi.spyOn(transactionsService, 'listTransactions').mockResolvedValue({
      ...EMPTY_PAGE,
      results: [unlabelledTx],
      count: 1,
    });
    vi.spyOn(transactionsService, 'updateTransactionLabel').mockResolvedValue({
      ...unlabelledTx,
      label_id: 5,
      label_name: 'Groceries',
      label_color: '#22c55e',
    });

    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await pickLabelFilter('Unlabeled');
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: -1 }),
      ),
    );
    const callsBeforeEdit = vi.mocked(transactionsService.listTransactions).mock.calls.length;

    // Assign a real label to the row — it no longer belongs under "Unlabeled".
    // Scoped to the row (rather than getByRole('combobox', { name })) since
    // that's the combination proven to work in TransactionLabelCell's own
    // tests — there's also the filter bar's combobox on the page to avoid.
    const row = screen.getByText('CORNER STORE').closest('tr')!;
    await userEvent.click(within(row).getByRole('combobox'));
    await waitFor(() => within(document.body).getByRole('listbox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Groceries' }));

    await waitFor(() =>
      expect(
        vi.mocked(transactionsService.listTransactions).mock.calls.length,
      ).toBeGreaterThan(callsBeforeEdit),
    );
    // The refetch must still be scoped to the active filter, not drop it.
    expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ label_id: -1 }),
    );
  });
});

// Regression: the household-switch button preserved label_id, but the
// filter is household-scoped — after switching, the previously-selected
// label can't appear in the new household's options while the request
// still filters by its old id, so the control looks cleared but the table
// comes back empty.
describe('TransactionsPage household switch', () => {
  beforeEach(() => {
    vi.spyOn(labelsService, 'listLabels').mockResolvedValue(LABELS);
  });

  it('clears the label filter when switching households', async () => {
    renderPage();
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));

    await pickLabelFilter('Groceries');
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: 5 }),
      ),
    );

    // Open the switcher and pick a household (even the current one — the
    // fix must clear label_id regardless of which household is chosen).
    await userEvent.click(screen.getByRole('button', { name: 'Test Household' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Test Household' }));

    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: undefined }),
      ),
    );
  });
});

// Regression: a stale/invalid label_id in the URL (a bookmark, a label
// deleted since, or browser history from another household) made the
// filter control show "All labels" (labelId matched no option) while
// TransactionsPage still sent that id, filtering the table to no rows —
// silently, with no way to tell the control and the request disagreed.
describe('TransactionsPage stale label_id', () => {
  beforeEach(() => {
    vi.spyOn(labelsService, 'listLabels').mockResolvedValue(LABELS);
  });

  it('clears an invalid label_id from the URL once the labels have loaded', async () => {
    renderPage(['/?label_id=999']);

    // The first request goes out with the stale id, before labels are known.
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ label_id: 999 }),
      ),
    );

    // Once labels load and 999 isn't among them, it self-corrects: cleared
    // from the URL and refetched with no filter.
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ label_id: undefined }),
      ),
    );
    expect(screen.getByTestId('url-search').textContent).not.toContain('label_id');
  });

  it('does not clear label_id=-1, the always-valid "Unlabeled" sentinel', async () => {
    renderPage(['/?label_id=-1']);
    await waitFor(() =>
      expect(transactionsService.listTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ label_id: -1 }),
      ),
    );

    // Give the self-correction effect a tick to (incorrectly) fire if this regresses.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(transactionsService.listTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ label_id: -1 }),
    );
    expect(screen.getByTestId('url-search').textContent).toContain('label_id=-1');
  });

  // Regression: a failed load leaves `labels` empty (Promise.all rejects
  // before setLabels() ever runs) but still flips isLoading to false — which
  // used to look identical to "labelId isn't among the household's labels",
  // wrongly clearing a perfectly valid bookmarked filter, losing it, and
  // masking the real error behind a fresh unfiltered request.
  it('does not clear label_id while the load has failed, even for an id that would otherwise be valid', async () => {
    vi.spyOn(transactionsService, 'listTransactions').mockRejectedValue(new Error('boom'));

    renderPage(['/?label_id=5']); // 5 matches LABELS — would resolve fine if loading succeeded
    await waitFor(() => expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1));
    await screen.findByText('Could not load transactions.');

    // Give the self-correction effect a tick to (incorrectly) fire if this regresses.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByTestId('url-search').textContent).toContain('label_id=5');
    expect(transactionsService.listTransactions).toHaveBeenCalledTimes(1);
  });
});
