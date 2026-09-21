// pages/transactions/import-csv-dialog/import-csv-dialog.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveHouseholdProvider } from '@context/active-household-context';
import { AuthProvider } from '@context/auth-context';
import { makeAccount, makeFileImportResult, makeHousehold, makeUser } from '@serve/mocks';
import type { Household } from '@serve/types/global';
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
