// pages/budgets/index.tsx — Budgets page.
//
// "Create budget" opens CreateBudgetDialog for the active household; a
// successful create prepends the new budget to the list rather than
// re-fetching. The button stays enabled while the list is still loading,
// so a create can land while that fetch is in flight — requestIdRef lets
// the create invalidate that fetch's eventual response instead of letting
// it overwrite the optimistic update with a list that predates it.
// Renaming and deactivating a budget land in follow-up PRs, once their
// endpoints exist.

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Skeleton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { BudgetCard } from '@pages/budgets/budget-card';
import { CreateBudgetDialog } from '@pages/budgets/create-budget-dialog';
import type { Budget } from '@serve/types/global';
import { listBudgets, ApiError } from '@services/budgets';

export function BudgetsPage() {
  const navigate = useNavigate();
  const { activeHousehold } = useActiveHousehold();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const householdId = activeHousehold?.id;

  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  // Bumped whenever a fetch's response should no longer be trusted to
  // overwrite budgets — currently just a create landing mid-fetch. Guards
  // only the data-applying branches, not the loading flag itself, so an
  // invalidated request still clears isLoading once it settles.
  const requestIdRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    function load() {
      const requestId = ++requestIdRef.current;

      if (householdId === undefined) {
        setBudgets([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      listBudgets(householdId)
        .then(result => {
          if (ignore || requestId !== requestIdRef.current) return;
          setBudgets(result);
        })
        .catch(err => {
          if (ignore || requestId !== requestIdRef.current) return;
          setError(err instanceof ApiError ? err.message : 'Could not load budgets.');
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });
    }

    loadRef.current = load;
    load();

    return () => {
      ignore = true;
    };
  }, [householdId]);

  function handleCreated(budget: Budget) {
    // Invalidates any in-flight list fetch: it was requested before this
    // budget existed, so its eventual response would otherwise overwrite
    // this optimistic update with a list that predates the create. Also
    // clears isLoading directly rather than waiting for that fetch to
    // settle, so the new card is visible immediately instead of sitting
    // behind a stale loading skeleton until then.
    requestIdRef.current += 1;
    setBudgets(prev => [budget, ...prev]);
    setIsLoading(false);
    setCreateOpen(false);
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
              Budgets
            </Typography>
            <Typography color="text.secondary">
              {activeHousehold
                ? `Showing budgets in ${activeHousehold.name}`
                : 'No household selected.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwitchHouseholdButton />
            {activeHousehold && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                Create budget
              </Button>
            )}
          </Box>
        </Box>

        {!activeHousehold ? null : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {isLoading ? (
              [0, 1].map(i => <Skeleton key={i} variant="rounded" height={100} />)
            ) : error ? (
              <Box>
                <Typography color="error" sx={{ mb: 1 }}>
                  {error}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => loadRef.current()}>
                  Retry
                </Button>
              </Box>
            ) : budgets.length === 0 ? (
              <Typography color="text.secondary">
                No budgets yet — click &quot;Create budget&quot; above.
              </Typography>
            ) : (
              budgets.map(budget => <BudgetCard key={budget.id} budget={budget} />)
            )}
          </Box>
        )}
      </Container>

      {activeHousehold && (
        <CreateBudgetDialog
          open={createOpen}
          householdId={activeHousehold.id}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreated}
        />
      )}
    </Box>
  );
}
