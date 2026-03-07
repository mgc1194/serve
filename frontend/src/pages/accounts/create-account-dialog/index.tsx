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
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'name') nameInputRef.current?.focus();
  }, [step]);

  // Load banks when the dialog opens
  useEffect(() => {
    if (!open) return;
    setBanksLoading(true);
    setBanksError(null);
    listBanks()
      .then(setBanks)
      .catch(() => setBanksError('Could not load banks. Please try again.'))
      .finally(() => setBanksLoading(false));
  }, [open]);

  // Sync pre-selected household when prop changes
  useEffect(() => {
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
  }, [open, preselectedHousehold]);

  function handleClose() {
    onClose();
  }

  function handleBack() {
    setCreateError(null);
    if (step === 'bank') setStep(preselectedHousehold ? 'bank' : 'household');
    else if (step === 'type') setStep('bank');
    else if (step === 'name') setStep('type');
  }

  function selectHousehold(h: Household) {
    setSelectedHousehold(h);
    setStep('bank');
  }

  function selectBank(bank: Bank) {
    setSelectedBank(bank);
    setSelectedTypeId(null);
    setStep('type');
  }

  function selectType(typeId: number) {
    setSelectedTypeId(typeId);
    setStep('name');
    setName('');
  }

  async function handleCreate() {
    if (!selectedHousehold || selectedTypeId == null || !name.trim()) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await createAccount({
        household_id: selectedHousehold.id,
        account_type_id: selectedTypeId,
        name: name.trim(),
      });
      onCreated();
      handleClose();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setIsCreating(false);
    }
  }

  const canGoBack = step !== 'household' && !(step === 'bank' && preselectedHousehold);

  const stepTitles: Record<Step, string> = {
    household: 'Choose a household',
    bank: 'Choose a bank',
    type: `Choose account type`,
    name: 'Name your account',
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {canGoBack && (
          <IconButton onClick={handleBack} size="small" aria-label="Go back" sx={{ mr: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            Add account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
            {stepTitles[step]}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Breadcrumb trail */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
          {selectedHousehold && !preselectedHousehold && (
            <Typography variant="caption" color="text.secondary">
              {selectedHousehold.name}
            </Typography>
          )}
          {selectedBank && (
            <>
              {selectedHousehold && !preselectedHousehold && (
                <Typography variant="caption" color="text.disabled">·</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {selectedBank.name}
              </Typography>
            </>
          )}
        </Box>

        {/* Step 1 — Household */}
        {step === 'household' && (
          <List disablePadding>
            {households.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No households found.
              </Typography>
            ) : (
              households.map(h => (
                <ListItemButton
                  key={h.id}
                  onClick={() => selectHousehold(h)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText primary={h.name} />
                </ListItemButton>
              ))
            )}
          </List>
        )}

        {/* Step 2 — Bank */}
        {step === 'bank' && (
          <>
            {banksLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {banksError && (
              <Alert severity="error">{banksError}</Alert>
            )}
            {!banksLoading && !banksError && (
              <List disablePadding>
                {banks.map(bank => (
                  <ListItemButton
                    key={bank.id}
                    onClick={() => selectBank(bank)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <AccountBalanceOutlinedIcon
                      sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }}
                    />
                    <ListItemText primary={bank.name} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </>
        )}

        {/* Step 3 — Account type */}
        {step === 'type' && selectedBank && (
          <List disablePadding>
            {selectedBank.account_types.map(at => (
              <ListItemButton
                key={at.id}
                onClick={() => selectType(at.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText primary={at.name} />
              </ListItemButton>
            ))}
          </List>
        )}

        {/* Step 4 — Name */}
        {step === 'name' && (
          <Box>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}
            <OutlinedInput
              inputRef={nameInputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Mario's 360 Savings"
              inputProps={{ 'aria-label': 'Account name' }}
              size="small"
              fullWidth
              disabled={isCreating}
              endAdornment={
                isCreating && (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                )
              }
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
              fullWidth
            >
              Add account
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
