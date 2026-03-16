// pages/transactions/import-csv-dialog/import-csv-dialog.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountDetail, FileImportResult } from '@serve/types/global';
import * as accountsService from '@services/accounts';
import * as transactionsService from '@services/transactions';

import { ImportCsvDialog } from './index';

vi.mock('@services/accounts');
vi.mock('@services/transactions');

const HOUSEHOLDS = [
  { id: 1, name: 'Smith Household' },
  { id: 2, name: 'Johnson Household' },
];

const ACCOUNTS: AccountDetail[] = [
  {
    id: 1,
    name: "Alice's 360 Savings",
    handler_key: 'co-savings',
    account_type_id: 1,
    account_type: '360 Performance Savings',
    bank_id: 1,
    bank_name: 'Capital One',
    household_id: 1,
    household_name: 'Smith Household',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const IMPORT_RESULT: FileImportResult = {
  filename: 'transactions.csv',
  inserted: 5,
  skipped: 0,
  total: 5,
  error: null,
};

function renderDialog(props: Partial<React.ComponentProps<typeof ImportCsvDialog>> = {}) {
  const defaults = {
    open: true,
    households: HOUSEHOLDS,
    onImported: vi.fn(),
    onClose: vi.fn(),
  };
  return render(<ImportCsvDialog {...defaults} {...props} />);
}

beforeEach(() => {
  vi.mocked(accountsService.listAccounts).mockResolvedValue(ACCOUNTS);
  vi.mocked(transactionsService.importTransactionsCsv).mockResolvedValue(IMPORT_RESULT);
});

describe('ImportCsvDialog', () => {
  // ── Step 0: Household selection ───────────────────────────────────────────

  it('renders step 0 on open', () => {
    renderDialog();
    expect(screen.getByText(/choose the household/i)).toBeDefined();
  });

  it('disables Next on step 0 when no household is selected', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables Next on step 0 after a household is selected', () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(false);
  });

  // ── Step 1: Account selection ─────────────────────────────────────────────

  it('advances to step 1 and fetches accounts after selecting a household', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(accountsService.listAccounts).toHaveBeenCalledWith({ household_id: 1 });
    });
    expect(screen.getByText(/choose the account/i)).toBeDefined();
  });

  it('shows an error on step 1 when listAccounts fails', async () => {
    vi.mocked(accountsService.listAccounts).mockRejectedValue(
      new Error('Could not load accounts.'),
    );
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Could not load accounts.')).toBeDefined();
    });
  });

  it('disables Next on step 1 when no account is selected', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(true);
  });

  // ── Step 2: File upload ───────────────────────────────────────────────────

  it('advances to step 2 after selecting an account', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText(/drag & drop/i)).toBeDefined();
  });

  it('disables Import on step 2 when no file is selected', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByRole('button', { name: /import/i }).hasAttribute('disabled')).toBe(true);
  });

  // ── Step 3: Success ───────────────────────────────────────────────────────

  it('advances to the success screen after a successful upload', async () => {
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText('Import successful')).toBeDefined();
    });
  });

  it('calls onImported after a successful upload', async () => {
    const onImported = vi.fn();
    renderDialog({ onImported });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledWith(IMPORT_RESULT);
    });
  });

  it('shows an upload error when importTransactionsCsv throws', async () => {
    vi.mocked(transactionsService.importTransactionsCsv).mockRejectedValue(
      new Error('Upload failed. Please try again.'),
    );
    renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText('Upload failed. Please try again.')).toBeDefined();
    });
  });

  // ── Cancel / reset ────────────────────────────────────────────────────────

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets to step 0 after closing and reopening', async () => {
    const { rerender } = renderDialog();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByText(/choose the account/i));

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    rerender(
      <ImportCsvDialog
        open={true}
        households={HOUSEHOLDS}
        onImported={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/choose the household/i)).toBeDefined();
  });

  it('calls onClose when Close is clicked on the success screen', async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Smith Household'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByText(/choose the account/i));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText("Alice's 360 Savings"));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => screen.getByText('Import successful'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('prevents backdrop close while uploading', async () => {
  vi.mocked(transactionsService.importTransactionsCsv).mockReturnValue(
    new Promise(() => {}), // never resolves
  );
  const onClose = vi.fn();
  renderDialog({ onClose });

  // Advance to step 2 and start an upload
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('Smith Household'));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  await waitFor(() => screen.getByText(/choose the account/i));
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText("Alice's 360 Savings"));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  const file = new File([''], 'transactions.csv', { type: 'text/csv' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /import/i }));

  // Simulate backdrop click while uploading
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
});

it('hides the stepper on the success screen', async () => {
  renderDialog();
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('Smith Household'));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  await waitFor(() => screen.getByText(/choose the account/i));
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText("Alice's 360 Savings"));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  const file = new File([''], 'transactions.csv', { type: 'text/csv' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /import/i }));

  await waitFor(() => screen.getByText('Import successful'));
  expect(document.querySelector('.MuiStepper-root')).toBeNull();
});

it('resets account and file state when household changes', async () => {
  renderDialog();

  // Advance to step 1 and select an account
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('Smith Household'));
  fireEvent.click(screen.getByRole('button', { name: /next/i }));

  await waitFor(() => screen.getByText(/choose the account/i));
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText("Alice's 360 Savings"));

  // Go back to step 0 and change household
  fireEvent.click(screen.getByRole('button', { name: /back/i }));
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('Johnson Household'));

  // Advance to step 1 again — Next should be disabled (accountId was reset)
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
  await waitFor(() => screen.getByText(/choose the account/i));
  expect(screen.getByRole('button', { name: /next/i }).hasAttribute('disabled')).toBe(true);
});
});
