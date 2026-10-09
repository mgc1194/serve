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
//
// The Labels column shows which of the household's labels have this
// category assigned (label.category_id), reusing the same colored-chip
// treatment HouseholdLabelsSection uses. There is currently no UI to set
// a label's category_id at all — manage-label/index.tsx's own comment
// documents that as deferred — so this column is expected to show "—"
// for every row until that's built; it's still correct to wire up now
// rather than wait, since it reads whatever label-category assignments
// exist (now or once that lands) without needing further changes here.

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
import type { Category, Label } from '@serve/types/global';
import { contrastTextColor } from '@utils/contrast-text-color';

const TYPE_LABELS: Record<Category['type'], string> = {
  earning: 'Earning',
  spending: 'Spending',
};

interface HouseholdCategoriesSectionProps {
  householdId: number;
  householdName: string;
  categories: Category[];
  labels: Label[];
  onCategoriesChanged: (categories: Category[]) => void;
}

export function HouseholdCategoriesSection({
  householdId,
  householdName,
  categories,
  labels,
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
                <TableCell>Labels</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {ordered.map(category => {
                const categoryLabels = labels.filter(l => l.category_id === category.id);
                return (
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
                    <TableCell>
                      {categoryLabels.length === 0 ? (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {categoryLabels.map(label => (
                            <Chip
                              key={label.id}
                              label={label.name}
                              size="small"
                              sx={{
                                bgcolor: label.color,
                                color: contrastTextColor(label.color),
                                fontWeight: 500,
                              }}
                            />
                          ))}
                        </Box>
                      )}
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
                );
              })}
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
