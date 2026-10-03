// pages/budgets/index.tsx — Budgets page.
//
// "Create budget" opens CreateBudgetDialog for the active household; a
// successful create prepends the new budget to the list rather than
// re-fetching. The button stays enabled while the list is still loading,
// so a create can land while that fetch is in flight — pendingCreatesRef
// tracks it so that when the in-flight fetch's response does arrive (a
// list that predates the create, and so is missing it), it gets merged in
// rather than either overwriting the optimistic update or, if the fetch
// were discarded outright instead, taking any of the household's other
// budgets down with it. If that fetch fails instead, the error (and
// Retry) still surfaces alongside whatever budgets are already known,
// rather than either hiding them or silently dropping the failure and
// the ability to recover the rest of the household's budgets.

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

  // Guards which fetch is allowed to touch state at all (data and loading
  // flag alike), so an earlier request resolving after a newer one has
  // started — e.g. Retry clicked again before the first attempt settles —
  // can't overwrite the newer one's result or clear isLoading out from
  // under it.
  const requestIdRef = useRef(0);

  // Budgets created locally that no list response has confirmed yet.
  // Merged into whichever response applies next, so a fetch that was
  // already in flight at create time — and so returns a list predating it
  // — adds the create back in instead of dropping it, without discarding
  // the rest of that response's (still perfectly good) budgets.
  const pendingCreatesRef = useRef<Budget[]>([]);

  useEffect(() => {
    let ignore = false;
    pendingCreatesRef.current = [];

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
          const unconfirmed = pendingCreatesRef.current.filter(
            pending => !result.some(b => b.id === pending.id),
          );
          setBudgets([...unconfirmed, ...result]);
          pendingCreatesRef.current = [];
        })
        .catch(err => {
          if (ignore || requestId !== requestIdRef.current) return;
          // A create may have already landed while this request was in
          // flight, so this failure doesn't necessarily mean there's
          // nothing to show — budgets may already hold that optimistic
          // entry. The error still surfaces (with Retry) so the household's
          // other, not-yet-fetched budgets stay recoverable; the render
          // below shows both together instead of the error hiding budgets.
          setError(err instanceof ApiError ? err.message : 'Could not load budgets.');
        })
        .finally(() => {
          if (!ignore && requestId === requestIdRef.current) setIsLoading(false);
        });
    }

    loadRef.current = load;
    load();

    return () => {
      ignore = true;
    };
  }, [householdId]);

  function handleCreated(budget: Budget) {
    // Tracked in case a list fetch already in flight resolves afterward
    // with a response that predates this create — see pendingCreatesRef.
    pendingCreatesRef.current = [...pendingCreatesRef.current, budget];
    setBudgets(prev => [budget, ...prev]);
    setIsLoading(false);
    setError(null);
    setCreateOpen(false);
  }

  function handleUpdated(budget: Budget) {
    setBudgets(prev => prev.map(b => (b.id === budget.id ? budget : b)));
    // Keep pendingCreatesRef's copy in sync too — otherwise a stale list
    // fetch's merge (see above) would revert this rename by re-adding the
    // old, pre-rename object it's still holding onto.
    pendingCreatesRef.current = pendingCreatesRef.current.map(b =>
      b.id === budget.id ? budget : b,
    );
  }

  function handleDeactivated(id: number) {
    setBudgets(prev => prev.filter(b => b.id !== id));
    // Same reasoning as handleUpdated: a stale fetch's merge must not
    // re-add a budget that's since been deactivated.
    pendingCreatesRef.current = pendingCreatesRef.current.filter(b => b.id !== id);
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
            ) : (
              <>
                {error && (
                  <Box>
                    <Typography color="error" sx={{ mb: 1 }}>
                      {error}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={() => loadRef.current()}>
                      Retry
                    </Button>
                  </Box>
                )}
                {budgets.length > 0 ? (
                  budgets.map(budget => (
                    <BudgetCard
                      key={budget.id}
                      budget={budget}
                      onUpdated={handleUpdated}
                      onDeactivated={handleDeactivated}
                    />
                  ))
                ) : !error ? (
                  <Typography color="text.secondary">
                    No budgets yet — click &quot;Create budget&quot; above.
                  </Typography>
                ) : null}
              </>
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
