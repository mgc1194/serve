// pages/budget-detail/index.tsx — Full planned-vs-actual view for a single
// budget: an Income section and an Expenses section (each with per-category
// Planned/Actual/Diff and section totals), a "Saved this..." headline
// (actual income minus actual expenses), and an "Add a category" control
// shared between both sections — which section a newly-added category lands
// in is determined by its own category.type, not by which control was used.
//
// No GET /budgets/{id} single-fetch endpoint exists (or is needed) for one
// budget among a household's handful — the budget itself is found by id in
// the same listBudgets(householdId) response already used everywhere else.
//
// The period range is shown read-only here — PATCH /budgets/{id}/ only
// supports renaming (see its docstring), so editing period dates after
// creation isn't something this page can offer yet.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { CategoryMultiSelect } from '@components/category-multi-select';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { BudgetSection } from '@pages/budget-detail/budget-section';
import type { Budget, BudgetLine, Category } from '@serve/types/global';
import {
  createBudgetLine,
  deleteBudgetLine,
  listBudgetLines,
  listBudgets,
  updateBudgetLine,
  ApiError,
} from '@services/budgets';
import { listCategories } from '@services/categories';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

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
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);

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

      Promise.all([listBudgets(householdId), listBudgetLines(budgetId), listCategories(householdId)])
        .then(([budgets, ls, cats]) => {
          if (ignore) return;
          const found = budgets.find(b => b.id === budgetId) ?? null;
          setBudget(found);
          setLines(ls);
          setCategories(cats);
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

  async function handlePlannedAmountChange(lineId: number, value: number) {
    setActionError(null);
    try {
      const updated = await updateBudgetLine(lineId, { planned_amount: value });
      setLines(prev => prev.map(l => (l.id === lineId ? updated : l)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update planned amount.');
    }
  }

  async function handleRemove(lineId: number) {
    setActionError(null);
    try {
      await deleteBudgetLine(lineId);
      setLines(prev => prev.filter(l => l.id !== lineId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not remove category.');
    }
  }

  async function handleAddSelected() {
    if (!budget || selectedCategoryIds.length === 0) return;
    setIsAdding(true);
    setActionError(null);
    try {
      const created = await Promise.all(
        selectedCategoryIds.map(categoryId =>
          createBudgetLine(budget.id, { category_id: categoryId, planned_amount: 0 }),
        ),
      );
      setLines(prev => [...prev, ...created]);
      setSelectedCategoryIds([]);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not add categories.');
    } finally {
      setIsAdding(false);
    }
  }

  const incomeLines = lines.filter(l => l.category_type === 'earning');
  const expenseLines = lines.filter(l => l.category_type === 'spending');
  const incomeActualTotal = incomeLines.reduce((sum, l) => sum + Number(l.actual_amount), 0);
  const expenseActualTotal = expenseLines.reduce((sum, l) => sum + Number(l.actual_amount), 0);
  const saved = incomeActualTotal - expenseActualTotal;

  const usedCategoryIds = new Set(lines.map(l => l.category_id));
  const availableCategories = categories.filter(c => !usedCategoryIds.has(c.id));

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
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {formatPeriod(budget)}
            </Typography>

            <Typography variant="h4" sx={{ mb: 0.5 }}>
              {formatMoney(saved)}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Saved this {budget.type === 'project' ? 'budget' : 'period'}
            </Typography>

            {actionError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {actionError}
              </Typography>
            )}

            <BudgetSection
              title="Income"
              lines={incomeLines}
              isIncome
              onPlannedAmountChange={handlePlannedAmountChange}
              onRemove={handleRemove}
            />
            <BudgetSection
              title="Expenses"
              lines={expenseLines}
              isIncome={false}
              onPlannedAmountChange={handlePlannedAmountChange}
              onRemove={handleRemove}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', maxWidth: 400 }}>
              <CategoryMultiSelect
                categories={availableCategories}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
                disabled={isAdding}
              />
              <Button
                variant="outlined"
                onClick={handleAddSelected}
                disabled={selectedCategoryIds.length === 0 || isAdding}
                startIcon={isAdding ? <CircularProgress size={14} /> : null}
                sx={{ mt: 0.25 }}
              >
                Add
              </Button>
            </Box>
          </>
        ) : null}
      </Container>
    </Box>
  );
}
