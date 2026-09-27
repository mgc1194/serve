// pages/budgets/index.tsx — Budgets page.
//
// "Create budget" opens CreateBudgetDialog for the active household; a
// successful create prepends the new budget to the list rather than
// re-fetching. Renaming and deactivating a budget land in follow-up PRs,
// once their endpoints exist.

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

  useEffect(() => {
    let ignore = false;

    function load() {
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
          if (ignore) return;
          setBudgets(result);
        })
        .catch(err => {
          if (ignore) return;
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
    setBudgets(prev => [budget, ...prev]);
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
