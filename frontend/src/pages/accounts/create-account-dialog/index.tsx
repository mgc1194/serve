// pages/accounts/create-account-dialog.tsx — Stepped dialog for creating an account.
//
// Step 1: Choose household
// Step 2: Choose bank
// Step 3: Choose account type
// Step 4: Name the account

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  OutlinedInput,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { Bank, Household } from '@serve/types/global';
import { createAccount, listBanks, ApiError } from '@services/accounts';

interface CreateAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Pre-select a household and skip step 1. */
  preselectedHousehold?: Household | null;
  households: Household[];
}

type Step = 'household' | 'bank' | 'type' | 'name';

interface BanksFetchResult {
  requestKey: string;
  banks: Bank[];
  error: string | null;
}

export function CreateAccountDialog({
  open,
  onClose,
  onCreated,
  preselectedHousehold,
  households,
}: CreateAccountDialogProps) {
  const [step, setStep] = useState<Step>(preselectedHousehold ? 'bank' : 'household');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(
    preselectedHousehold ?? null,
  );
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'name') nameInputRef.current?.focus();
  }, [step]);

  // ── Banks fetch — requestKey pattern, no sync setState in effect ──────────
  const banksRequestKey = open ? 'banks' : null;
  const [banksFetchResult, setBanksFetchResult] = useState<BanksFetchResult | null>(null);

  const banksLoading =
    banksRequestKey !== null && banksFetchResult?.requestKey !== banksRequestKey;
  const banks: Bank[] =
    banksFetchResult?.requestKey === banksRequestKey ? banksFetchResult.banks : [];
  const banksError: string | null =
    banksFetchResult?.requestKey === banksRequestKey ? banksFetchResult.error : null;

  useEffect(() => {
    if (banksRequestKey === null) return;

    const key = banksRequestKey;
    listBanks()
      .then(data => setBanksFetchResult({ requestKey: key, banks: data, error: null }))
      .catch(() =>
        setBanksFetchResult({
          requestKey: key,
          banks: [],
          error: 'Could not load banks. Please try again.',
        }),
      );
  }, [banksRequestKey]);
  
  // ── Reset step/selection when dialog opens — render-time adjustment ───────
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevPreselected, setPrevPreselected] = useState(preselectedHousehold);

  if (open !== prevOpen || preselectedHousehold !== prevPreselected) {
    setPrevOpen(open);
    setPrevPreselected(preselectedHousehold);
    if (open) {
      if (preselectedHousehold) {
        setSelectedHousehold(preselectedHousehold);
        setStep('bank');
      } else {
        setSelectedHousehold(null);
        setStep('household');
      }
      setSelectedBank(null);
      setSelectedTypeId(null);
      setName('');
      setCreateError(null);
    }
  }

  function handleClose() {
    onClose();
  }

  function handleBack() {
    setCreateError(null);
    if (step === 'bank') setStep(preselectedHousehold ? 'bank' : 'household');
    else if (step === 'type') setStep('bank');
    else if (step === 'name') setStep('type');
  }

  async function handleCreate() {
    if (!selectedHousehold || !selectedBank || !selectedTypeId || !name.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      await createAccount({
        name: name.trim(),
        household_id: selectedHousehold.id,
        bank_id: selectedBank.id,
        account_type_id: selectedTypeId,
      });
      onCreated();
      onClose();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setIsCreating(false);
    }
  }

  const selectedBankTypes = selectedBank?.account_types ?? [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {step !== 'household' && step !== (preselectedHousehold ? 'bank' : 'household') && (
          <IconButton onClick={handleBack} size="small" sx={{ mr: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        Add account
      </DialogTitle>

      <DialogContent>
        {step === 'household' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Which household is this account for?
            </Typography>
            <List disablePadding>
              {households.map(h => (
                <ListItemButton
                  key={h.id}
                  onClick={() => {
                    setSelectedHousehold(h);
                    setStep('bank');
                  }}
                >
                  <ListItemText primary={h.name} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}

        {step === 'bank' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a bank.
            </Typography>
            {banksLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            )}
            {banksError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {banksError}
              </Alert>
            )}
            {!banksLoading && !banksError && (
              <List disablePadding>
                {banks.map(bank => (
                  <ListItemButton
                    key={bank.id}
                    onClick={() => {
                      setSelectedBank(bank);
                      setStep('type');
                    }}
                  >
                    <AccountBalanceOutlinedIcon
                      fontSize="small"
                      sx={{ mr: 1.5, color: 'text.secondary' }}
                    />
                    <ListItemText primary={bank.name} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}

        {step === 'type' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose an account type.
            </Typography>
            <List disablePadding>
              {selectedBankTypes.map(type => (
                <ListItemButton
                  key={type.id}
                  onClick={() => {
                    setSelectedTypeId(type.id);
                    setStep('name');
                  }}
                >
                  <ListItemText primary={type.name} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}

        {step === 'name' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Give your account a name.
            </Typography>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}
            <OutlinedInput
              inputRef={nameInputRef}
              fullWidth
              placeholder="e.g. Joint current account"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
              }}
              endAdornment={
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!name.trim() || isCreating}
                    onClick={handleCreate}
                    startIcon={isCreating ? <CircularProgress size={14} /> : <AddIcon />}
                  >
                    Create
                  </Button>
                </InputAdornment>
              }
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
