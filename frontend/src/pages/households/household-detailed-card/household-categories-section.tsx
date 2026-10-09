// pages/households/household-detailed-card/household-categories-section.tsx
//
// Displays a household's categories as a flat, read-only table — one row
// per category, ordered type-then-name (matching the Category model's own
// Meta.ordering) with an explicit Type column, rather than the chip-cloud
// HouseholdLabelsSection uses for labels. Rows are not clickable — this
// table is a view only; "Manage categories" is the only way to open
// CategoryManagementDialog (always in list mode — kept simple, no
// separate create-mode entry point).
//
// Paginated at a fixed 5 rows per page (per PR feedback), using MUI's
// custom pagination actions pattern:
// https://mui.com/material-ui/react-table/#custom-pagination-actions

import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';

import { CategoryManagementDialog } from '@components/category-management-dialog';
import type { Category } from '@serve/types/global';

const TYPE_LABELS: Record<Category['type'], string> = {
  earning: 'Earning',
  spending: 'Spending',
};

const ROWS_PER_PAGE = 5;

interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => void;
}

// MUI's standard custom pagination actions, adapted to this file's needs —
// see the link in the file-level comment above.
function TablePaginationActions({ count, page, rowsPerPage, onPageChange }: TablePaginationActionsProps) {
  const theme = useTheme();
  const lastPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1);

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={e => onPageChange(e, 0)}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={e => onPageChange(e, page - 1)}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
      </IconButton>
      <IconButton
        onClick={e => onPageChange(e, page + 1)}
        disabled={page >= lastPage}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeftIcon /> : <KeyboardArrowRightIcon />}
      </IconButton>
      <IconButton
        onClick={e => onPageChange(e, lastPage)}
        disabled={page >= lastPage}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

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
  const [page, setPage] = useState(0);

  const ordered = [...categories].sort(
    (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
  );
  // Clamped display-only — if categories shrink (e.g. a deactivation) while
  // on a later page, this falls back to the new last page instead of
  // rendering blank; doesn't touch `page` itself, so navigating is
  // unaffected if categories grow again.
  const lastPage = Math.max(0, Math.ceil(ordered.length / ROWS_PER_PAGE) - 1);
  const safePage = Math.min(page, lastPage);
  const pageRows = ordered.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE);

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
              {pageRows.map(category => (
                <TableRow key={category.id}>
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
            {categories.length > ROWS_PER_PAGE && (
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[ROWS_PER_PAGE]}
                    colSpan={2}
                    count={categories.length}
                    rowsPerPage={ROWS_PER_PAGE}
                    page={safePage}
                    onPageChange={(_event, newPage) => setPage(newPage)}
                    ActionsComponent={TablePaginationActions}
                  />
                </TableRow>
              </TableFooter>
            )}
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
