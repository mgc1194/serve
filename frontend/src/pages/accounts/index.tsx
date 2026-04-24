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

interface FetchResult {
  requestKey: string;
  accounts: AccountDetail[];
  error: string | null;
}

export function AccountsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

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

  // A stable string key representing the current fetch request. isLoading and
  // accounts are derived from whether the last result matches the current key.
  const requestKey = String(householdIdFilter ?? 'all');
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);

  const isLoading = fetchResult?.requestKey !== requestKey;
  const accounts: AccountDetail[] =
    fetchResult?.requestKey === requestKey ? fetchResult.accounts : [];
  const error: string | null =
    fetchResult?.requestKey === requestKey ? fetchResult.error : null;

  useEffect(() => {
    const key = requestKey;
    listAccounts({ household_id: householdIdFilter })
      .then(data => setFetchResult({ requestKey: key, accounts: data, error: null }))
      .catch(err =>
        setFetchResult({
          requestKey: key,
          accounts: [],
          error: err instanceof ApiError ? err.message : 'Could not load accounts.',
        }),
      );
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function reload() {
    // Clear the result so isLoading becomes true, then re-fetch.
    setFetchResult(null);
  }

  // Trigger a re-fetch when reload() clears fetchResult.
  useEffect(() => {
    if (fetchResult !== null) return;

    const key = requestKey;
    listAccounts({ household_id: householdIdFilter })
      .then(data => setFetchResult({ requestKey: key, accounts: data, error: null }))
      .catch(err =>
        setFetchResult({
          requestKey: key,
          accounts: [],
          error: err instanceof ApiError ? err.message : 'Could not load accounts.',
        }),
      );
  }, [fetchResult]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUpdated(updated: AccountDetail) {
    setFetchResult(prev =>
      prev ? { ...prev, accounts: prev.accounts.map(a => (a.id === updated.id ? updated : a)) } : prev,
    );
  }

  function handleDeleted(id: number) {
    setFetchResult(prev =>
      prev ? { ...prev, accounts: prev.accounts.filter(a => a.id !== id) } : prev,
    );
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
          onRetry={reload}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onAddAccount={() => setCreateOpen(true)}
        />
      </Container>

      <CreateAccountDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={reload}
        preselectedHousehold={preselectedHousehold}
        households={households}
      />
    </Box>
  );
}
