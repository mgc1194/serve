// pages/households/household-detailed-card/household-categories-section.tsx
//
// Displays a household's categories as a flat table — one row per
// category, ordered type-then-name (matching the Category model's own
// Meta.ordering) with an explicit Type column, rather than the chip-cloud
// HouseholdLabelsSection uses for labels. CategoryManagementDialog always
// opens in list mode (kept simple — no separate create-mode entry point);
// "Manage categories" and clicking a row both just open it, and the user
// picks "New category" or an existing row's edit action from inside.

import {
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { CategoryManagementDialog } from '@components/category-management-dialog';
import type { Category } from '@serve/types/global';

const TYPE_LABELS: Record<Category['type'], string> = {
  earning: 'Earning',
  spending: 'Spending',
};

interface HouseholdCategoriesSectionProps {
  householdId: number;
  householdName: string;
  categories: Category[];
  onCategoriesChanged: (categories: Category[]) => void;
}

export function HouseholdCategoriesSection({
  householdId,
  householdName,
  categories,
  onCategoriesChanged,
}: HouseholdCategoriesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const ordered = [...categories].sort(
    (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
  );

  function openManage() {
    setDialogOpen(true);
  }

  return (
    <>
      <Box>
        <Typography variant="subtitle2" component="h5" color="text.secondary" sx={{ mb: 1.5 }}>
          Categories
        </Typography>

        {categories.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>
            No categories yet.
          </Typography>
        ) : (
          <Table size="small" sx={{ mb: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordered.map(category => (
                <TableRow key={category.id} hover onClick={openManage} sx={{ cursor: 'pointer' }}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={TYPE_LABELS[category.type]}
                      size="small"
                      color={category.type === 'earning' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button
          size="small"
          onClick={openManage}
          variant="outlined"
          sx={{ fontSize: '0.75rem', py: 0.5 }}
        >
          Manage categories
        </Button>
      </Box>

      <CategoryManagementDialog
        open={dialogOpen}
        householdId={householdId}
        householdName={householdName}
        onClose={() => setDialogOpen(false)}
        onCategoriesChanged={onCategoriesChanged}
      />
    </>
  );
}
