// pages/budgets/budget-detail-card/budget-categories-section.tsx
//
// Shows the categories currently tracked by a budget (its BudgetLines) as
// removable chips, plus an inline Autocomplete to add another from the
// household's active, not-yet-added categories. No separate save step —
// selecting a category immediately creates the line; removing a chip
// immediately deletes it. No amount/notes editing here — that's a later
// PR's "money goals" feature.

import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import type { BudgetLine, Category } from '@serve/types/global';
import { createBudgetLine, deleteBudgetLine, ApiError } from '@services/budgets';
import { listCategories } from '@services/categories';

interface BudgetCategoriesSectionProps {
  budgetId: number;
  householdId: number;
  lines: BudgetLine[];
  onLinesChanged: (lines: BudgetLine[]) => void;
}

export function BudgetCategoriesSection({
  budgetId,
  householdId,
  lines,
  onLinesChanged,
}: BudgetCategoriesSectionProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories(householdId)
      .then(setCategories)
      .catch(() => {
        /* non-fatal — the add-category picker just stays empty */
      });
  }, [householdId]);

  const usedCategoryIds = new Set(lines.map(l => l.category_id));
  const available = categories.filter(c => !usedCategoryIds.has(c.id));

  async function handleAdd(category: Category | null) {
    if (!category) return;
    setError(null);
    try {
      const line = await createBudgetLine(budgetId, { category_id: category.id });
      onLinesChanged([...lines, line]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add category.');
    }
  }

  async function handleRemove(lineId: number) {
    setError(null);
    try {
      await deleteBudgetLine(lineId);
      onLinesChanged(lines.filter(l => l.id !== lineId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove category.');
    }
  }

  return (
    <Box>
      <Typography variant="subtitle2" component="h5" color="text.secondary" sx={{ mb: 1.5 }}>
        Categories
      </Typography>

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {lines.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>
          No categories yet.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          {lines.map(line => (
            <Chip
              key={line.id}
              label={line.category_name}
              size="small"
              onDelete={() => handleRemove(line.id)}
            />
          ))}
        </Box>
      )}

      <Autocomplete
        options={available}
        getOptionLabel={c => c.name}
        value={null}
        onChange={(_event, value) => handleAdd(value)}
        size="small"
        sx={{ maxWidth: 260 }}
        renderInput={params => (
          <TextField {...params} label="Add a category" placeholder="Search categories" />
        )}
      />
    </Box>
  );
}
