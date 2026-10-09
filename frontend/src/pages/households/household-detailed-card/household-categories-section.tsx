// pages/households/household-detailed-card/household-categories-section.tsx
//
// Displays a household's categories as a flat table — one row per
// category, ordered type-then-name (matching the Category model's own
// Meta.ordering) with an explicit Type column, rather than the chip-cloud
// HouseholdLabelsSection uses for labels. "Add category" opens the
// management dialog in create mode; clicking a row (or its edit icon)
// opens it in list mode — same division of labor as
// HouseholdLabelsSection/LabelManagementDialog, just with a bigger click
// target per row instead of a chip.

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
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
  const [dialogInitialMode, setDialogInitialMode] = useState<'list' | 'create'>('list');

  const ordered = [...categories].sort(
    (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
  );

  function openManage() {
    setDialogInitialMode('list');
    setDialogOpen(true);
  }

  function openCreate() {
    setDialogInitialMode('create');
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
                <TableCell align="right" />
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
                  <TableCell align="right">
                    <Tooltip title={`Edit "${category.name}"`}>
                      <IconButton
                        size="small"
                        aria-label={`Edit ${category.name}`}
                        onClick={e => {
                          e.stopPropagation();
                          openManage();
                        }}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={openCreate}
          variant="outlined"
          sx={{ fontSize: '0.75rem', py: 0.5 }}
        >
          Add category
        </Button>
      </Box>

      <CategoryManagementDialog
        open={dialogOpen}
        householdId={householdId}
        householdName={householdName}
        initialMode={dialogInitialMode}
        onClose={() => setDialogOpen(false)}
        onCategoriesChanged={onCategoriesChanged}
      />
    </>
  );
}
