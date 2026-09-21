// pages/accounts/index.tsx — Accounts management page.
//
// Orchestrates data fetching for the session-wide active household.
// Rendering is delegated to AccountsTable.

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { AccountsTable } from '@pages/accounts/accounts-table';
import { CreateAccountDialog } from '@pages/accounts/create-account-dialog';
import type { AccountDetail } from '@serve/types/global';
import { listAccounts, ApiError } from '@services/accounts';

export function AccountsPage() {
  const navigate = useNavigate();
  const { activeHousehold, households } = useActiveHousehold();

  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const householdId = activeHousehold?.id;

  function load() {
    if (householdId === undefined) {
      setAccounts([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    listAccounts({ household_id: householdId })
      .then(setAccounts)
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Could not load accounts.');
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // load() kicks off a network fetch; loading/error state must flip
    // synchronously before it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  function handleUpdated(updated: AccountDetail) {
    setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  }

  function handleDeleted(id: number) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Dashboard
        </Button>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 4,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>
              Accounts
            </Typography>
            <Typography color="text.secondary">
              {activeHousehold
                ? `Showing accounts in ${activeHousehold.name}`
                : 'No household selected.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwitchHouseholdButton />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Add account
            </Button>
          </Box>
        </Box>

        <AccountsTable
          accounts={accounts}
          isLoading={isLoading}
          error={error}
          onRetry={load}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onAddAccount={() => setCreateOpen(true)}
        />
      </Container>

      <CreateAccountDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
        preselectedHousehold={activeHousehold}
        households={households}
      />
    </Box>
  );
}
