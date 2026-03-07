// pages/accounts/accounts-table.tsx — Accounts data table with loading, error, and empty states.
//
// Owns the Paper wrapper, all three non-data states (loading skeletons,
// error alert with retry, empty CTA), and the Table itself. Row-level
// interactions are delegated to AccountRow.

import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { AccountRow } from '@pages/accounts/account-row';
import type { AccountDetail } from '@serve/types/global';

interface AccountsTableProps {
  accounts: AccountDetail[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdated: (account: AccountDetail) => void;
  onDeleted: (id: number) => void;
  onAddAccount: () => void;
}

const HEADER_CELL_SX = {
  fontWeight: 600,
  fontSize: '0.75rem',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export function AccountsTable({
  accounts,
  isLoading,
  error,
  onRetry,
  onUpdated,
  onDeleted,
  onAddAccount,
}: AccountsTableProps) {
  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      {isLoading ? (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      ) : accounts.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No accounts yet.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddAccount}>
            Add your first account
          </Button>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={HEADER_CELL_SX}>Account</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Bank</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Type</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Household</TableCell>
              <TableCell sx={HEADER_CELL_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
