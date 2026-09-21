// pages/transactions/import-csv-dialog/import-csv-dialog.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider, useActiveHousehold } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { makeAccount, makeFileImportResult, makeHousehold, makeUser } from '@serve/mocks';
import type { AccountDetail, Household } from '@serve/types/global';
import * as accountsService from '@services/accounts';
import * as transactionsService from '@services/transactions';

import { ImportCsvDialog } from './index';

vi.mock('@services/accounts');
vi.mock('@services/transactions');

const HOUSEHOLD = makeHousehold({ id: 1, name: 'Smith Household' });

const ACCOUNTS = [
  makeAccount({
    id: 1,
    name: "Alice's 360 Savings",
    household_id: 1,
    household_name: 'Smith Household',
  }),
];

const IMPORT_RESULT = makeFileImportResult();

function renderDialog(
  props: Partial<React.ComponentProps<typeof ImportCsvDialog>> = {},
  households: Household[] = [HOUSEHOLD],
) {
  const defaults = {
    open: true,
    onImported: vi.fn(),
    onClose: vi.fn(),
  };
  return render(
    <AuthProvider
      value={{ user: makeUser({ households }), setUser: vi.fn(), isLoading: false, sessionError: false }}
    >
      <ActiveHouseholdProvider>
        <ImportCsvDialog {...defaults} {...props} />
      </ActiveHouseholdProvider>
    </AuthProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

// Advance from step 0 → step 1.
async function goToStep1() {
  await screen.findByRole('combobox');
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText("Alice's 360 Savings"));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  await screen.findByText(/drag & drop/i);
}

beforeEach(() => {
  vi.mocked(accountsService.listAccounts).mockResolvedValue(ACCOUNTS);
  vi.mocked(transactionsService.importTransactionsCsv).mockResolvedValue(IMPORT_RESULT);
});

describe('ImportCsvDialog', () => {
  // ── Step 0: Account selection ───────────────────────────────────────────

  it('fetches accounts for the session-wide active household on open', async () => {
    renderDialog();
    await waitFor(() =>
      expect(accountsService.listAccounts).toHaveBeenCalledWith({ household_id: 1 }),
    );
    expect(screen.getByText(/choose the account/i)).toBeDefined();
  });

  it('shows an error on step 0 when listAccounts fails', async () => {
    vi.mocked(accountsService.listAccounts).mockRejectedValue(
      new Error('Could not load accounts.'),
    );
    renderDialog();
    await screen.findByText('Could not load accounts.');
  });

  it('disables Next on step 0 when no account is selected', async () => {
    renderDialog();
    await screen.findByRole('combobox');
    expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(true);
  });

  it('shows a message instead of the account picker when there is no active household', () => {
    renderDialog({}, []);
    expect(screen.getByText(/no household selected/i)).toBeDefined();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  // ── Step 1: File upload ───────────────────────────────────────────────────

  it('advances to step 1 after selecting an account', async () => {
    renderDialog();
    await goToStep1();
    expect(screen.getByText(/drag & drop/i)).toBeDefined();
  });

  it('disables Import on step 1 when no file is selected', async () => {
    renderDialog();
    await goToStep1();
    expect(screen.getByRole('button', { name: /import/i }).hasAttribute('disabled')).toBe(true);
  });

  // ── Step 2: Success ───────────────────────────────────────────────────────

  it('advances to the success screen after a successful upload', async () => {
    renderDialog();
    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await screen.findByText('Import successful');
  });

  it('calls onImported after a successful upload', async () => {
    const onImported = vi.fn();
    renderDialog({ onImported });
    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => expect(onImported).toHaveBeenCalledWith(IMPORT_RESULT));
  });

  it('shows an upload error when importTransactionsCsv throws', async () => {
    vi.mocked(transactionsService.importTransactionsCsv).mockRejectedValue(
      new Error('Upload failed. Please try again.'),
    );
    renderDialog();
    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await screen.findByText('Upload failed. Please try again.');
  });

  // ── Cancel / reset ────────────────────────────────────────────────────────

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    await waitFor(() => expect(accountsService.listAccounts).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets to step 0 after closing and reopening', async () => {
    renderDialog();
    await goToStep1();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByText(/choose the account/i)).toBeDefined();
  });

  it('calls onClose when Close is clicked on the success screen', async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await screen.findByText('Import successful');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('prevents backdrop close while uploading', async () => {
    vi.mocked(transactionsService.importTransactionsCsv).mockReturnValue(
      new Promise(() => {}), // never resolves
    );
    const onClose = vi.fn();
    renderDialog({ onClose });

    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    const backdrop = document.querySelector('[role="presentation"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);
    }
    expect(onClose).not.toHaveBeenCalled();
  });

  it('hides the stepper on the success screen', async () => {
    renderDialog();
    await goToStep1();

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await screen.findByText('Import successful');
    expect(document.querySelector('.MuiStepper-root')).toBeNull();
  });
});

describe('ImportCsvDialog stale request regression', () => {
  // Regresses to a bug where a slow listAccounts() request for the previous
  // household could resolve after the request for the newly-active
  // household and replace the account picker with the wrong household's
  // accounts — risking an import into the wrong account.
  it('ignores a stale accounts response for the previous household after switching', async () => {
    const HOUSEHOLD_A = makeHousehold({ id: 1, name: 'Alpha Household' });
    const HOUSEHOLD_B = makeHousehold({ id: 2, name: 'Beta Household' });

    const forA = deferred<AccountDetail[]>();
    const forB = deferred<AccountDetail[]>();
    vi.mocked(accountsService.listAccounts).mockReturnValueOnce(forA.promise).mockReturnValueOnce(forB.promise);

    function Harness() {
      const { setActiveHousehold } = useActiveHousehold();
      return (
        <>
          <button type="button" onClick={() => setActiveHousehold(HOUSEHOLD_B)}>
            Switch to Beta
          </button>
          <ImportCsvDialog open onImported={vi.fn()} onClose={vi.fn()} />
        </>
      );
    }

    render(
      <AuthProvider
        value={{
          user: makeUser({ households: [HOUSEHOLD_A, HOUSEHOLD_B] }),
          setUser: vi.fn(),
          isLoading: false,
          sessionError: false,
        }}
      >
        <ActiveHouseholdProvider>
          <Harness />
        </ActiveHouseholdProvider>
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(accountsService.listAccounts).toHaveBeenCalledWith({ household_id: 1 }),
    );

    // Switch to household B while A's request is still pending. The switch
    // trigger is a plain sibling button, not something reachable through the
    // dialog's own UI (the open modal makes background content inert) — it
    // stands in for the real trigger (a page's SwitchHouseholdButton), which
    // is genuinely unreachable while this dialog is open. Query by text
    // since the modal's aria-hidden management on background content
    // excludes it from role-based queries.
    fireEvent.click(screen.getByText('Switch to Beta'));

    await waitFor(() =>
      expect(accountsService.listAccounts).toHaveBeenCalledWith({ household_id: 2 }),
    );

    // B's request resolves first...
    forB.resolve([
      makeAccount({ id: 2, name: "Beta's Checking", household_id: 2, household_name: 'Beta Household' }),
    ]);
    await waitFor(() => expect(screen.getByRole('combobox').getAttribute('aria-disabled')).toBeNull());
    fireEvent.mouseDown(screen.getByRole('combobox'));
    await screen.findByText("Beta's Checking");

    // ...then A's stale request resolves late. It must not clobber the picker.
    forA.resolve([
      makeAccount({ id: 1, name: "Alpha's Savings", household_id: 1, household_name: 'Alpha Household' }),
    ]);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByText("Beta's Checking")).toBeDefined();
    expect(screen.queryByText("Alpha's Savings")).toBeNull();
  });
});
