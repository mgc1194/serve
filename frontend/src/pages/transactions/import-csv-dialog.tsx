// pages/transactions/import-csv-dialog.tsx — Multi-step CSV import dialog.
//
// Step 0 — Household selection: user picks which household to import into.
// Step 1 — Account selection: user picks the account the CSV belongs to.
// Step 2 — File upload: drag-and-drop or browse for a CSV, then import.
//
// On successful import the dialog closes immediately and the parent refreshes.
// On error an inline alert is shown on the upload step so the user can retry
// without losing their household/account selection.

import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { AccountDetail, FileImportResult, Household } from '@serve/types/global';
import { listAccounts } from '@services/accounts';
import { importTransactionsCsv, ApiError } from '@services/transactions';

interface ImportCsvDialogProps {
  open: boolean;
  households: Household[];
  /** Called after a successful import so the parent can refresh. */
  onImported: (result: FileImportResult) => void;
  onClose: () => void;
}

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch accounts whenever the user advances to step 1
  useEffect(() => {
    if (step !== 1 || householdId === '') return;

    setAccountsLoading(true);
    setAccountsError(null);
    listAccounts({ household_id: householdId })
      .then(setAccounts)
      .catch(err => {
        setAccountsError(
          err instanceof ApiError ? err.message : 'Could not load accounts.',
        );
      })
      .finally(() => setAccountsLoading(false));
  }, [step, householdId]);

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
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
    e.target.value = '';
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
        handleClose();
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import transactions from CSV</DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ── Step 0: Household selection ───────────────────────────── */}
        {step === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose the household you're importing transactions for.
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="import-household-label">Household</InputLabel>
              <Select
                labelId="import-household-label"
                value={householdId}
                label="Household"
                onChange={e => setHouseholdId(e.target.value as number)}
              >
                {households.map(h => (
                  <MenuItem key={h.id} value={h.id}>
                    {h.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* ── Step 1: Account selection ─────────────────────────────── */}
        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose the account this CSV belongs to. The import handler is
              determined by the account type.
            </Typography>

            {accountsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : accountsError ? (
              <Alert severity="error">{accountsError}</Alert>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel id="import-account-label">Account</InputLabel>
                <Select
                  labelId="import-account-label"
                  value={accountId}
                  label="Account"
                  onChange={e => setAccountId(e.target.value as number)}
                >
                  {accounts.map(a => (
                    <MenuItem key={a.id} value={a.id}>
                      <Box>
                        <Typography variant="body2">{a.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.bank_name} · {a.account_type}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {/* ── Step 2: File upload ───────────────────────────────────── */}
        {step === 2 && (
          <Box>
            {selectedAccount && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Importing into <strong>{selectedAccount.name}</strong> (
                {selectedAccount.bank_name})
              </Alert>
            )}

            <Box
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: isDragging ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragging ? 'action.hover' : 'background.paper',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <CloudUploadOutlinedIcon
                sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {file ? file.name : 'Drag & drop a CSV here, or click to browse'}
              </Typography>
              {file && (
                <Typography variant="caption" color="text.disabled">
                  {(file.size / 1024).toFixed(1)} KB
                </Typography>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>

        {step > 0 && (
          <Button onClick={() => setStep(s => s - 1)} disabled={isUploading}>
            Back
          </Button>
        )}

        {/* Step 0 → 1 */}
        {step === 0 && (
          <Button
            variant="contained"
            disabled={householdId === ''}
            onClick={() => setStep(1)}
          >
            Next
          </Button>
        )}

        {/* Step 1 → 2 */}
        {step === 1 && (
          <Button
            variant="contained"
            disabled={accountId === '' || accountsLoading || !!accountsError}
            onClick={() => setStep(2)}
          >
            Next
          </Button>
        )}

        {/* Step 2: Import */}
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
      </DialogActions>
    </Dialog>
  );
}
