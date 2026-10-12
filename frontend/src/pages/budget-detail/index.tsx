// pages/budget-detail/index.tsx — Per-budget detail page. For now this is
// the budget's name and period, a placeholder net-this-month section, and
// an "Add category" control that opens CreateBudgetLineDialog — the real
// net figure and the Earnings/Spending columns (BudgetColumn/
// BudgetLineRow) that would actually show a created line are still
// deferred to their own follow-up PR, so creating one here has no visible
// effect on the page yet beyond the dialog closing.
//
// No GET /budgets/{id} single-fetch endpoint exists (or is needed) for one
// budget among a household's handful — the budget itself is found by id in
// the same listBudgets(householdId) response already used everywhere else.

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { CreateBudgetLineDialog } from '@pages/budget-detail/create-budget-line-dialog';
import type { Budget } from '@serve/types/global';
import { listBudgets, ApiError } from '@services/budgets';

// Matches transaction-row.tsx's formatDate, for consistency across the
// app. Appending T00:00:00 forces local-time parsing of the bare
// YYYY-MM-DD date — without it, `new Date(iso)` parses as UTC midnight,
// which can display as the previous day in negative-UTC-offset timezones.
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${formatDate(budget.period_start)} – ${formatDate(budget.period_end)}`;
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
  const [lineDialogOpen, setLineDialogOpen] = useState(false);

  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  // Guards which fetch is allowed to touch state at all (data and loading
  // flag alike), so an earlier request resolving after a newer one has
  // started — e.g. Retry clicked again before the first attempt settles —
  // can't overwrite the newer one's result or clear isLoading out from
  // under it. Same pattern as BudgetsPage.
  const requestIdRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    function load() {
      const requestId = ++requestIdRef.current;

      // Clears the previous scope's budget (and closes any open dialog
      // reading budgetId/householdId off it) synchronously, before the new
      // fetch even starts. Without this, a route change to a different
      // budget — or the active household changing — left `budget` (and a
      // still-open CreateBudgetLineDialog) pointing at the old scope for
      // the whole duration of the new fetch: a submit in that window could
      // create a line on the wrong budget, and the dialog could reappear
      // open once the new budget loaded, since lineDialogOpen was never
      // reset either.
      setBudget(null);
      setLineDialogOpen(false);

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
          if (ignore || requestId !== requestIdRef.current) return;
          const found = budgets.find(b => b.id === budgetId) ?? null;
          setBudget(found);
          if (!found) setError('Budget not found.');
        })
        .catch(err => {
          if (ignore || requestId !== requestIdRef.current) return;
          setError(err instanceof ApiError ? err.message : 'Could not load budget.');
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

            {/* Placeholder — the real net-this-month figure is wired up in
                a follow-up PR, once it's sourced from the budget's lines. */}
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="h6">Net this month: —</Typography>
            </Box>

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => setLineDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Add category
            </Button>
          </>
        ) : null}

        {householdId !== undefined && budget && (
          <CreateBudgetLineDialog
            open={lineDialogOpen}
            budgetId={budget.id}
            householdId={householdId}
            onClose={() => setLineDialogOpen(false)}
            onCreate={() => {
              // The created line has nowhere to render yet — the
              // Earnings/Spending columns aren't wired into this page
              // until a follow-up PR fetches the budget's lines.
            }}
          />
        )}
      </Container>
    </Box>
  );
}
