// pages/budget-detail/index.tsx — Per-budget detail page. For now this is
// just the budget's name and period — the planned-vs-actual sections, the
// add-category control, and the sync action are intentionally deferred to
// their own follow-up PRs rather than landing all at once.
//
// No GET /budgets/{id} single-fetch endpoint exists (or is needed) for one
// budget among a household's handful — the budget itself is found by id in
// the same listBudgets(householdId) response already used everywhere else.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import type { Budget } from '@serve/types/global';
import { listBudgets, ApiError } from '@services/budgets';

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${budget.period_start} – ${budget.period_end}`;
}

export function BudgetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const budgetId = Number(id);
  const { activeHousehold } = useActiveHousehold();
  const householdId = activeHousehold?.id;

  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    let ignore = false;

    function load() {
      if (householdId === undefined) {
        setIsLoading(false);
        return;
      }
      if (Number.isNaN(budgetId)) {
        setError('Budget not found.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      listBudgets(householdId)
        .then(budgets => {
          if (ignore) return;
          const found = budgets.find(b => b.id === budgetId) ?? null;
          setBudget(found);
          if (!found) setError('Budget not found.');
        })
        .catch(err => {
          if (ignore) return;
          setError(err instanceof ApiError ? err.message : 'Could not load budget.');
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
  }, [householdId, budgetId]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/budgets')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Budgets
        </Button>

        {!activeHousehold ? (
          <Typography color="text.secondary">No household selected.</Typography>
        ) : isLoading ? (
          <Typography color="text.secondary">Loading budget…</Typography>
        ) : error ? (
          <Box>
            <Typography color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button variant="outlined" size="small" onClick={() => loadRef.current()}>
              Retry
            </Button>
          </Box>
        ) : budget ? (
          <>
            <Typography variant="h3" sx={{ mb: 0.5 }}>
              {budget.name}
            </Typography>
            <Typography color="text.secondary">{formatPeriod(budget)}</Typography>
          </>
        ) : null}
      </Container>
    </Box>
  );
}
