// pages/budgets/category-management-dialog/list-categories.tsx
//
// List mode — categories grouped into Spending/Earning sections (matching
// the Category model's own ordering), each active row with an edit button.
// A "Show inactive" toggle reveals deactivated categories with a Reactivate
// action instead of Edit.

import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';

import type { Category } from '@serve/types/global';

interface ListCategoriesProps {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  showInactive: boolean;
  onToggleShowInactive: (next: boolean) => void;
  onEdit: (category: Category) => void;
  onReactivate: (categoryId: number) => void;
  onNewCategory: () => void;
  onClose: () => void;
}

function CategoryGroup({
  title,
  categories,
  onEdit,
  onReactivate,
}: {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onReactivate: (categoryId: number) => void;
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
          <Typography
            variant="body2"
            sx={{ color: category.is_active ? 'text.primary' : 'text.disabled' }}
          >
            {category.name}
          </Typography>
          {category.is_active ? (
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
          ) : (
            <Button size="small" onClick={() => onReactivate(category.id)}>
              Reactivate
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function ListCategories({
  categories,
  isLoading,
  error,
  showInactive,
  onToggleShowInactive,
  onEdit,
  onReactivate,
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
          <CategoryGroup
            title="Spending"
            categories={spending}
            onEdit={onEdit}
            onReactivate={onReactivate}
          />
          <CategoryGroup
            title="Earning"
            categories={earning}
            onEdit={onEdit}
            onReactivate={onReactivate}
          />
        </>
      )}

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={showInactive}
            onChange={e => onToggleShowInactive(e.target.checked)}
          />
        }
        label={<Typography variant="body2">Show inactive</Typography>}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={onNewCategory}>
          New category
        </Button>
      </Box>
    </Box>
  );
}
