// pages/budget-detail/create-budget-line-dialog/index.tsx
//
// Opened from "Add category" on the Budget detail page. Picks one of the
// household's active categories (reads from the same shared query
// HouseholdCategoriesSection/CategoryManagementDialog/the label picker do —
// see queries/categories.ts) and a whole-dollar planned amount.
//
// Doesn't pre-filter out categories already on this budget: the backend
// already rejects a duplicate with a clear '"<category>" is already part
// of this budget.' error (api/v1/budgets.py::create_budget_line), shown
// here as the form error, so there's no separate client-side check to
// keep in sync with the budget's actual lines.

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { useCategories } from '@serve/queries/categories';
import type { BudgetLine } from '@serve/types/global';
import { createBudgetLine, ApiError } from '@services/budgets';

interface CreateBudgetLineDialogProps {
  open: boolean;
  budgetId: number;
  householdId: number;
  onClose: () => void;
  onCreate: (line: BudgetLine) => void;
}

export function CreateBudgetLineDialog({
  open,
  budgetId,
  householdId,
  onClose,
  onCreate,
}: CreateBudgetLineDialogProps) {
  const categoriesQuery = useCategories(householdId, { enabled: open });
  const activeCategories = (categoriesQuery.data ?? []).filter(category => category.is_active);

  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resets the form each time the dialog opens, and whenever the
  // budget/household it's scoped to changes — e.g. the route moves to a
  // different budget, or the active household changes, while this dialog
  // stays mounted. Without budgetId/householdId here, a half-filled
  // selection from the old scope would stick around and could be
  // submitted against the new one.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoryId('');
    setAmount('');
    setError(null);
  }, [open, budgetId, householdId]);

  const parsedAmount = Number(amount);
  const isValidAmount = amount.trim() !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0;
  // isFetching (not just isLoading) also covers a background refetch of
  // already-cached data — e.g. the 30s staleTime (queries/categories.ts)
  // expiring while this dialog sits open. Re-checking membership in
  // activeCategories (rather than trusting categoryId alone) catches the
  // case where that refetch's result deactivates the selected category:
  // the backend doesn't reject an inactive category_id on its own, so
  // without this a line could be added for a category the picker no
  // longer even offers.
  const selectedCategoryStillActive = activeCategories.some(category => category.id === categoryId);
  const canCreate =
    selectedCategoryStillActive && isValidAmount && !isCreating && !categoriesQuery.isFetching;

  function handleClose() {
    if (isCreating) return;
    onClose();
  }

  async function handleCreate() {
    // The categoryId === '' check is redundant with canCreate (which
    // already implies it via selectedCategoryStillActive) — it's here so
    // TS can narrow categoryId to number below, since that implication
    // isn't something it can see through .some().
    if (!canCreate || categoryId === '') return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createBudgetLine(budgetId, {
        category_id: categoryId,
        planned_amount: parsedAmount,
      });
      onCreate(created);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add category.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>Add category</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {categoriesQuery.isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading categories…
            </Typography>
          </Box>
        ) : categoriesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => categoriesQuery.refetch()}>
                Retry
              </Button>
            }
          >
            Could not load categories.
          </Alert>
        ) : (
          <FormControl size="small" fullWidth disabled={isCreating}>
            <InputLabel id="budget-line-category-select">Category</InputLabel>
            <Select
              labelId="budget-line-category-select"
              label="Category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              {activeCategories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {/* A household can have both an earning and a spending
                      category with the same name (Category's uniqueness
                      includes type) — the type suffix is the only thing
                      that tells those two apart here, and it's what
                      decides which Earnings/Spending column this line
                      lands in later. */}
                  {category.name} ({category.type === 'earning' ? 'Earning' : 'Spending'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          label="Budgeted amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isCreating && handleCreate()}
          type="number"
          size="small"
          fullWidth
          disabled={isCreating}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canCreate}
          startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : null}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
