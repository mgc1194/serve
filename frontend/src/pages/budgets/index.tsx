// pages/budgets/index.tsx — Budgets management page.
//
// Household-scoped, mirroring AccountsPage's header (SwitchHouseholdButton +
// "Showing budgets in X") combined with HouseholdsPage's body layout (an
// inline create form, then a card per item). A budget's card manages which
// of the household's categories it tracks (BudgetLine rows) — categories
// themselves stay a household-wide catalog, managed unchanged via
// CategoryManagementDialog, triggered from a small button near the header.
//
// Planned-vs-actual tracking (BudgetLine.planned_amount) has no UI yet —
// a later PR.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Divider, Skeleton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { BudgetDetailCard } from '@pages/budgets/budget-detail-card';
import { CategoryManagementDialog } from '@pages/budgets/category-management-dialog';
import { CreateBudgetForm } from '@pages/budgets/create-budget-form';
import type { Budget } from '@serve/types/global';
import { listBudgets } from '@services/budgets';

export function BudgetsPage() {
  const navigate = useNavigate();
  const { activeHousehold } = useActiveHousehold();
  const householdId = activeHousehold?.id;

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

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
        .catch(() => {
          if (ignore) return;
          setError('Could not load budgets.');
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
  }

  function handleUpdated(budget: Budget) {
    setBudgets(prev => prev.map(b => (b.id === budget.id ? budget : b)));
  }

  function handleDeleted(id: number) {
    setBudgets(prev => prev.filter(b => b.id !== id));
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
              <Button variant="outlined" onClick={() => setCategoryDialogOpen(true)}>
                Manage categories
              </Button>
            )}
          </Box>
        </Box>

        {activeHousehold && (
          <>
            <CreateBudgetForm householdId={activeHousehold.id} onCreate={handleCreated} />
            <Divider sx={{ my: 4 }} />
          </>
        )}

        {!activeHousehold ? null : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {isLoading ? (
              [0, 1].map(i => <Skeleton key={i} variant="rounded" height={180} />)
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
                No budgets yet — create one above. A budget tracks one or more categories over a
                period (or, for a project, with no fixed period at all).
              </Typography>
            ) : (
              budgets.map(budget => (
                <BudgetDetailCard
                  key={budget.id}
                  budget={budget}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))
            )}
          </Box>
        )}
      </Container>

      {activeHousehold && (
        <CategoryManagementDialog
          open={categoryDialogOpen}
          householdId={activeHousehold.id}
          householdName={activeHousehold.name}
          onClose={() => setCategoryDialogOpen(false)}
          onCategoriesChanged={() => {}}
        />
      )}
    </Box>
  );
}
