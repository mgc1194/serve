// pages/transactions/import-csv-dialog/account-selection.tsx
//
// Step 1 — Account selection: user picks the account the CSV belongs to.

import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

import type { AccountDetail } from '@serve/types/global';

interface AccountSelectionProps {
  accounts: AccountDetail[];
  accountsLoading: boolean;
  accountsError: string | null;
  accountId: number | '';
  setAccountId: (id: number | '') => void;
}

export function AccountSelection({
  accounts,
  accountsLoading,
  accountsError,
  accountId,
  setAccountId,
}: AccountSelectionProps) {
  return (
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
        <FormControl fullWidth size="small" disabled={accounts.length === 0}>
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
  );
}
