// pages/budgets/category-management-dialog/list-categories/index.tsx
//
// List mode — active categories grouped into Spending/Earning sections
// (matching the Category model's own ordering), each row with an edit
// button. Deactivated categories aren't shown here — that's a deliberate,
// separate scope for a later change.

import EditIcon from '@mui/icons-material/Edit';
import { Alert, Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';

import type { Category } from '@serve/types/global';

interface ListCategoriesProps {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  onEdit: (category: Category) => void;
  onNewCategory: () => void;
  onClose: () => void;
}

function CategoryGroup({
  title,
  categories,
  onEdit,
}: {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {title}
      </Typography>
      {categories.map(category => (
        <Box
          key={category.id}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}
        >
          <Typography variant="body2">{category.name}</Typography>
          <Tooltip title={`Edit "${category.name}"`}>
            <IconButton
              size="small"
              aria-label={`Edit ${category.name}`}
              onClick={() => onEdit(category)}
              sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
}

export function ListCategories({
  categories,
  isLoading,
  error,
  onEdit,
  onNewCategory,
  onClose,
}: ListCategoriesProps) {
  const spending = categories.filter(c => c.type === 'spending');
  const earning = categories.filter(c => c.type === 'earning');

  return (
    <Box sx={{ pt: 1 }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : categories.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No categories yet. Create one to start grouping related labels.
        </Typography>
      ) : (
        <>
          <CategoryGroup title="Spending" categories={spending} onEdit={onEdit} />
          <CategoryGroup title="Earning" categories={earning} onEdit={onEdit} />
        </>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={onNewCategory}>
          New category
        </Button>
      </Box>
    </Box>
  );
}
