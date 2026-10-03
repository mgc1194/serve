// pages/budgets/index.tsx — Budgets page.
//
// "Create budget" opens CreateBudgetDialog for the active household, and
// rename/deactivate act directly on a BudgetCard — all three stay enabled
// while the list is still loading, so any of them can land while a list
// fetch is in flight. A response from that fetch can disagree with a local
// change in two different ways, each tracked separately and reconciled
// when the response arrives:
//   - presence (pendingCreatesRef): the response predates a create, so
//     it's simply missing — add it back in rather than letting it vanish.
//   - value (pendingUpdatesRef / pendingDeactivatedIdsRef): the response
//     still includes the budget, but read before a rename or deactivation
//     committed server-side — override its data (or drop it entirely for
//     a deactivation) rather than trusting what's actually stale data just
//     because the id matches.
// Either way, the rest of that response's (still perfectly good) budgets
// are kept, never discarded outright. If the fetch fails instead, the
// error (and Retry) still surfaces alongside whatever budgets are already
// known, rather than either hiding them or silently dropping the failure
// and the ability to recover the rest of the household's budgets.

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

  // Budgets created locally that no list response has confirmed present
  // yet. See the file-level comment above for how this and the two refs
  // below are each reconciled once a response arrives.
  const pendingCreatesRef = useRef<Budget[]>([]);

  // Budgets renamed locally that no list response has confirmed matches
  // yet — overridden onto a response's same-id entry instead of trusting
  // it, until a response's own data actually agrees.
  const pendingUpdatesRef = useRef<Budget[]>([]);

  // Ids deactivated locally that no list response has confirmed absent
  // yet — filtered out of a response instead of trusting its presence,
  // until a response actually omits it.
  const pendingDeactivatedIdsRef = useRef<number[]>([]);

  useEffect(() => {
    let ignore = false;
    pendingCreatesRef.current = [];
    pendingUpdatesRef.current = [];
    pendingDeactivatedIdsRef.current = [];

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

          // Drop any budget deactivated locally that this response still
          // includes (it predates the DELETE committing server-side).
          const withoutDeactivated = result.filter(
            b => !pendingDeactivatedIdsRef.current.includes(b.id),
          );
          pendingDeactivatedIdsRef.current = pendingDeactivatedIdsRef.current.filter(
            id => result.some(b => b.id === id),
          );

          // Override any budget whose rename this response doesn't yet
          // reflect (it predates the PATCH committing server-side).
          const reconciled = withoutDeactivated.map(b => {
            const pendingUpdate = pendingUpdatesRef.current.find(p => p.id === b.id);
            return pendingUpdate ?? b;
          });
          pendingUpdatesRef.current = pendingUpdatesRef.current.filter(pending => {
            const match = result.find(b => b.id === pending.id);
            return !(match && match.name === pending.name);
          });

          // Add back any locally created budget this response is missing.
          const unconfirmedCreates = pendingCreatesRef.current.filter(
            pending => !reconciled.some(b => b.id === pending.id),
          );
          pendingCreatesRef.current = [];

          setBudgets([...unconfirmedCreates, ...reconciled]);
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
    // Keep pendingCreatesRef's copy in sync too, in case this budget is
    // also still an unconfirmed create.
    pendingCreatesRef.current = pendingCreatesRef.current.map(b =>
      b.id === budget.id ? budget : b,
    );
    // Tracked regardless, so an in-flight fetch that already included this
    // budget (just with its pre-rename name) gets overridden rather than
    // trusted — see the reconciliation in load() above.
    pendingUpdatesRef.current = [
      ...pendingUpdatesRef.current.filter(b => b.id !== budget.id),
      budget,
    ];
  }

  function handleDeactivated(id: number) {
    setBudgets(prev => prev.filter(b => b.id !== id));
    pendingCreatesRef.current = pendingCreatesRef.current.filter(b => b.id !== id);
    pendingUpdatesRef.current = pendingUpdatesRef.current.filter(b => b.id !== id);
    // Tracked so an in-flight fetch that already included this budget
    // (read before the deactivation committed) gets it filtered out
    // rather than trusted — see the reconciliation in load() above.
    pendingDeactivatedIdsRef.current = [...pendingDeactivatedIdsRef.current, id];
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
