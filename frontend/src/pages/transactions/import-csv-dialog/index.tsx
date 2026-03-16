// pages/transactions/import-csv-dialog/index.tsx — Multi-step CSV import dialog.
//
// Step 0 — Household selection: user picks which household to import into.
// Step 1 — Account selection: user picks the account the CSV belongs to.
// Step 2 — File upload: drag-and-drop or browse for a CSV, then import.
// Step 3 — Success: import summary with a close button.
//
// On successful import the dialog advances to a success screen.
// On error an inline alert is shown on the upload step so the user can retry
// without losing their household/account selection.

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { AccountSelection } from '@pages/transactions/import-csv-dialog/account-selection';
import { CsvUpload } from '@pages/transactions/import-csv-dialog/csv-upload';
import { HouseholdSelection } from '@pages/transactions/import-csv-dialog/household-selection';
import { ImportSuccess } from '@pages/transactions/import-csv-dialog/import-success';
import type { AccountDetail, FileImportResult, Household } from '@serve/types/global';
import { listAccounts, ApiError as AccountsApiError } from '@services/accounts';
import { importTransactionsCsv, ApiError } from '@services/transactions';

interface ImportCsvDialogProps {
  open: boolean;
  households: Household[];
  /** Called after a successful import so the parent can refresh. */
  onImported: (result: FileImportResult) => void;
  onClose: () => void;
}

// Step 3 is the success screen — excluded from the Stepper.
const STEPS = ['Select household', 'Select account', 'Upload CSV'];

export function ImportCsvDialog({
  open,
  households,
  onImported,
  onClose,
}: ImportCsvDialogProps) {
  const [step, setStep] = useState(0);

  // Step 0
  const [householdId, setHouseholdId] = useState<number | ''>('');

  // Step 1
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | ''>('');

  // Step 2
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3
  const [importResult, setImportResult] = useState<FileImportResult | null>(null);

  // Fetch accounts whenever the user advances to step 1.
  useEffect(() => {
    if (step !== 1 || householdId === '') return;

    setAccountsLoading(true);
    setAccountsError(null);
    listAccounts({ household_id: householdId })
      .then(setAccounts)
      .catch(err => {
        setAccountsError(
          err instanceof AccountsApiError ? err.message : 'Could not load accounts.',
        );
      })
      .finally(() => setAccountsLoading(false));
  }, [step, householdId]);

  useEffect(() => {
    setAccounts([]);
    setAccountsLoading(false);
    setAccountsError(null);
    setAccountId('');
    setFile(null);
    setUploadError(null);
    setImportResult(null);
  }, [householdId]);

  function reset() {
    setStep(0);
    setHouseholdId('');
    setAccounts([]);
    setAccountsLoading(false);
    setAccountsError(null);
    setAccountId('');
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setUploadError(null);
    setImportResult(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDialogClose(_: unknown, reason: 'backdropClick' | 'escapeKeyDown') {
    if (isUploading) return;
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      handleClose();
    }
  }

  async function handleUpload() {
    if (!file || !accountId) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await importTransactionsCsv(accountId, file);

      if (result.error) {
        setUploadError(result.error);
      } else {
        onImported(result);
        setImportResult(result);
        setStep(3);
      }
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : 'Upload failed. Please try again.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  const selectedAccount =
    accountId !== '' ? accounts.find(a => a.id === accountId) : undefined;

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={isUploading}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Import transactions from CSV</DialogTitle>

      <DialogContent>
        {step < 3 && (
          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* ── Step 0: Household selection ───────────────────────────── */}
        {step === 0 && (
          <HouseholdSelection
            households={households}
            householdId={householdId}
            setHouseholdId={setHouseholdId}
          />
        )}

        {/* ── Step 1: Account selection ─────────────────────────────── */}
        {step === 1 && (
          <AccountSelection
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            accountId={accountId}
            setAccountId={setAccountId}
          />
        )}

        {/* ── Step 2: File upload ───────────────────────────────────── */}
        {step === 2 && (
          <CsvUpload
            selectedAccount={selectedAccount}
            file={file}
            setFile={setFile}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            uploadError={uploadError}
            setUploadError={setUploadError}
          />
        )}

        {/* ── Step 3: Import success ────────────────────────────────── */}
        {step === 3 && importResult && (
          <ImportSuccess result={importResult} />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step < 3 ? (
          <>
            <Button onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>

            {step > 0 && (
              <Button onClick={() => setStep(s => s - 1)} disabled={isUploading}>
                Back
              </Button>
            )}

            {step === 0 && (
              <Button
                variant="contained"
                disabled={householdId === ''}
                onClick={() => setStep(1)}
              >
                Next
              </Button>
            )}

            {step === 1 && (
              <Button
                variant="contained"
                disabled={accountId === '' || accountsLoading || !!accountsError}
                onClick={() => setStep(2)}
              >
                Next
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="contained"
                disabled={!file || isUploading}
                onClick={handleUpload}
                startIcon={
                  isUploading ? <CircularProgress size={16} color="inherit" /> : undefined
                }
              >
                {isUploading ? 'Uploading…' : 'Import'}
              </Button>
            )}
          </>
        ) : (
          <Button variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
