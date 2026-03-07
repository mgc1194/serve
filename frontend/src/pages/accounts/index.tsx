// pages/accounts/index.tsx — Accounts management page.
//
// Orchestrates data fetching and URL-driven filter state.
// Rendering is delegated to AccountsFilterBar and AccountsTable.

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import { AccountsFilterBar } from '@pages/accounts/accounts-filter-bar';
import { AccountsTable } from '@pages/accounts/accounts-table';
import { CreateAccountDialog } from '@pages/accounts/create-account-dialog';
import type { AccountDetail, Household } from '@serve/types/global';
import { listAccounts, ApiError } from '@services/accounts';

export function AccountsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Filter stored in URL so it survives reload and is shareable
  const householdIdParam = searchParams.get('household_id');
  const householdIdFilter = 
    householdIdParam !== null
      ? (() => {
        const parsed = Number(householdIdParam);
        return isNaN(parsed) ? undefined : parsed;
      })()
      : undefined;

  const households: Household[] = useMemo(() => user?.households ?? [], [user]);

  const preselectedHousehold = 
    householdIdFilter !== undefined
      ? (households.find(h => h.id === householdIdFilter) ?? null)
      : null;

  const activeHousehold =
    householdIdFilter !== undefined
      ? households.find(h => h.id === householdIdFilter)
      : undefined;

  function load() {
    setIsLoading(true);
    setError(null);
    listAccounts({ household_id: householdIdFilter })
      .then(setAccounts)
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Could not load accounts.');
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdIdFilter]);

  function handleUpdated(updated: AccountDetail) {
    setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  }

  function handleDeleted(id: number) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function setHouseholdFilter(id: number | undefined) {
    const next = new URLSearchParams(searchParams);
    if (id == null) {
      next.delete('household_id');
    } else {
      next.set('household_id', String(id));
    }
    setSearchParams(next, { replace: true });
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
                : 'All accounts across your households.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Add account
          </Button>
        </Box>

        <AccountsFilterBar
          households={households}
          householdId={householdIdFilter}
          onHouseholdChange={setHouseholdFilter}
        />

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
        preselectedHousehold={preselectedHousehold}
        households={households}
      />
    </Box>
  );
}