// pages/budget-detail/index.tsx — Per-budget detail page: the budget's
// name and period, a placeholder net-this-month section (the real figure
// is a separate follow-up — it needs the same lines fetched here, but
// isn't wired up yet), the Earnings/Spending columns (BudgetColumn/
// BudgetLineRow) built from the budget's own lines, and an "Add category"
// control that appends a newly-created line straight into those columns.
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
import { BudgetColumn } from '@pages/budget-detail/budget-column';
import { CreateBudgetLineDialog } from '@pages/budget-detail/create-budget-line-dialog';
import type { Budget, BudgetLine } from '@serve/types/global';
import { listBudgetLines, listBudgets, ApiError } from '@services/budgets';

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

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);

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

  // linesLoadRef gives the lines section's own retry button a stable
  // reference, same pattern as loadRef above.
  const linesLoadRef = useRef<() => void>(() => {});

  // Same requestId guard as the budget fetch above, for the same reason:
  // `ignore` alone only distinguishes "this effect run" from "a later one"
  // (e.g. budget changing) — it does nothing for two overlapping calls to
  // loadLines() from the SAME effect run, which Retry can produce (clicked
  // again before the first attempt settles). Without this, the older
  // response could overwrite the newer result and its .finally could clear
  // isLoadingLines while the newer request was still pending.
  const linesRequestIdRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    function loadLines() {
      const requestId = ++linesRequestIdRef.current;

      if (budget === null) {
        setLines([]);
        setLinesError(null);
        setIsLoadingLines(false);
        return;
      }

      setIsLoadingLines(true);
      setLinesError(null);

      listBudgetLines(budget.id)
        .then(result => {
          if (ignore || requestId !== linesRequestIdRef.current) return;
          setLines(result);
        })
        .catch(err => {
          if (ignore || requestId !== linesRequestIdRef.current) return;
          setLinesError(err instanceof ApiError ? err.message : 'Could not load categories.');
        })
        .finally(() => {
          if (!ignore && requestId === linesRequestIdRef.current) setIsLoadingLines(false);
        });
    }

    linesLoadRef.current = loadLines;
    loadLines();

    return () => {
      ignore = true;
    };
  }, [budget]);

  // Tracks the budget currently on screen by id, read (not captured) at
  // the moment a create actually resolves — see onCreate below. A plain
  // closure over `budget` wouldn't do: CreateBudgetLineDialog unmounts the
  // instant the route/household changes (budget resets to null), but its
  // already-in-flight create keeps running and still calls the onCreate
  // closure it was holding at that point, which closed over the OLD
  // budget — not whatever budget is on screen by the time the create
  // settles. A ref's .current is read fresh at call time, so it reflects
  // reality regardless of which stale closure is invoking it.
  const currentBudgetIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    currentBudgetIdRef.current = budget?.id;
  }, [budget]);

  const earningLines = lines.filter(line => line.category_type === 'earning');
  const spendingLines = lines.filter(line => line.category_type === 'spending');

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
                a follow-up PR, computed from the same lines fetched below. */}
            <Box sx={{ mt: 1.5, mb: 3 }}>
              <Typography variant="h6">Net this month: —</Typography>
            </Box>

            {isLoadingLines ? (
              <Typography color="text.secondary">Loading categories…</Typography>
            ) : linesError ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography color="error">{linesError}</Typography>
                <Button size="small" onClick={() => linesLoadRef.current()}>
                  Retry
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <BudgetColumn title="Earnings" lines={earningLines} />
                <BudgetColumn title="Spending" lines={spendingLines} />
              </Box>
            )}

            {/* Disabled while the lines GET is in flight (creating a line
                then would append it locally via onCreate, only for the
                older GET to resolve afterward and setLines(result)
                overwrite that with the pre-create snapshot) and while it's
                in an error state (the columns aren't even rendered then,
                so there'd be nowhere to show the new line appearing —
                Retry first). */}
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => setLineDialogOpen(true)}
              disabled={isLoadingLines || linesError !== null}
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
            onCreate={created => {
              // A create that started against this budget can still
              // resolve after the route/household has since moved to a
              // different budget. Reject it rather than appending a line
              // from the old budget into whatever's currently on screen.
              if (created.budget_id !== currentBudgetIdRef.current) return;
              setLines(prev => [...prev, created]);
            }}
          />
        )}
      </Container>
    </Box>
  );
}
