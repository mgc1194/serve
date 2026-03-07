// pages/households/index.tsx — Households management page.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, Container, Divider, Skeleton, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import { CreateAccountDialog } from '@pages/accounts/create-account-dialog';
import { CreateHouseholdForm } from '@pages/households/create-household-form';
import { HouseholdDetailCard } from '@pages/households/household-detailed-card';
import type { Household, HouseholdDetail } from '@serve/types/global';
import { listAccounts } from '@services/accounts';
import { listHouseholds } from '@services/households';

export function HouseholdsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  // user is guaranteed non-null here — this page is behind ProtectedRoute.
  const authedUser = user!;
  const [households, setHouseholds] = useState<HouseholdDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Account counts keyed by household id — fetched once, incremented locally.
  const [accountCounts, setAccountCounts] = useState<Record<number, number>>({});

  // Create account dialog — opened from a card's "Add account" chip
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccountHousehold, setAddAccountHousehold] = useState<Household | null>(null);

  useEffect(() => {
    listHouseholds()
      .then(loaded => {
        setHouseholds(loaded);
        // Fetch account counts separately — failure is non-fatal, cards just
        // show the fallback "Accounts" label rather than blocking the whole page.
        listAccounts()
          .then(accounts => {
            const counts: Record<number, number> = {};
            for (const h of loaded) counts[h.id] = 0;
            for (const a of accounts) {
              if (counts[a.household_id] !== undefined) counts[a.household_id]++;
            }
            setAccountCounts(counts);
          })
          .catch(() => { /* leave accountCounts empty — cards render with null */ });
      })
      .catch(() => setError('Could not load households. Please try again.'))
      .finally(() => setIsLoading(false));
  }, []);

  function handleCreated(h: HouseholdDetail) {
    setHouseholds(prev => [...prev, h]);
    setAccountCounts(prev => ({ ...prev, [h.id]: 0 }));
    setUser({ ...authedUser, households: [...authedUser.households, { id: h.id, name: h.name }] });
  }

  function handleUpdated(h: HouseholdDetail) {
    setHouseholds(prev => prev.map(x => (x.id === h.id ? h : x)));
    setUser({ ...authedUser, households: authedUser.households.map(x => x.id === h.id ? { id: h.id, name: h.name } : x) });
  }

  function handleDeleted(id: number) {
    setHouseholds(prev => prev.filter(x => x.id !== id));
    setAccountCounts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setUser({ ...authedUser, households: authedUser.households.filter(x => x.id !== id) });
  }

  function handleRetry() {
    setError(null);
    setIsLoading(true);
    listHouseholds()
      .then(loaded => {
        setHouseholds(loaded);
        listAccounts()
          .then(accounts => {
            const counts: Record<number, number> = {};
            for (const h of loaded) counts[h.id] = 0;
            for (const a of accounts) {
              if (counts[a.household_id] !== undefined) counts[a.household_id]++;
            }
            setAccountCounts(counts);
          })
          .catch(() => { /* non-fatal */ });
      })
      .catch(() => setError('Could not load households. Please try again.'))
      .finally(() => setIsLoading(false));
  }

  function handleAddAccount(household: HouseholdDetail) {
    setAddAccountHousehold({ id: household.id, name: household.name });
    setAddAccountOpen(true);
  }

  function handleAccountCreated() {
    if (addAccountHousehold) {
      setAccountCounts(prev => ({
        ...prev,
        [addAccountHousehold.id]: (prev[addAccountHousehold.id] ?? 0) + 1,
      }));
    }
    setAddAccountOpen(false);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: 6 }}>

        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Dashboard
        </Button>

        <Typography variant="h3" sx={{ mb: 1 }}>
          Households
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Manage your households and their members.
        </Typography>

        <CreateHouseholdForm onCreate={handleCreated} />

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {isLoading ? (
            [0, 1].map(i => <Skeleton key={i} variant="rounded" height={220} />)
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : households.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No households yet — create one above.
            </Typography>
          ) : (
            households.map(h => (
              <HouseholdDetailCard
                key={h.id}
                household={h}
                accountCount={accountCounts[h.id] ?? null}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                onAddAccount={handleAddAccount}
              />
            ))
          )}
        </Box>
      </Container>

      <CreateAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreated={handleAccountCreated}
        preselectedHousehold={addAccountHousehold}
        households={[]}
      />
    </Box>
  );
}
