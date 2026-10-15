// components/category-management-dialog/index.tsx
//
// Orchestrates the category management dialog: owns UI/form state,
// delegates data to queries/categories.ts's useCategories/useCreateCategory/
// useUpdateCategory/useDeactivateCategory, and delegates rendering to
// ListCategories (list mode) and ManageCategory (create / edit mode).
// Mirrors components/label-management-dialog's shape.
//
// Every mutation invalidates the shared categories query instead of
// reporting back through a callback prop — any other component reading
// this household's categories (HouseholdCategoriesSection, the label
// picker) re-renders with the fresh list on its own, wherever it is in
// the tree.
//
// isMutating guards the Dialog's own onClose (backdrop click / Escape —
// ManageCategory's own isSaving/isDeleting already disable its Back
// button) for the duration of a create/edit/deactivate, so the dialog
// can't be closed and reopened while one is in flight. List mode (and
// ListCategories' Close/New category/Edit controls) is never even
// rendered while a mutation is running, since handleSave/handleDeactivate
// are only reachable from ManageCategory's create/edit mode.
//
// Deactivated categories aren't otherwise exposed anywhere in this dialog
// yet (no "show inactive" view, no reactivate) — that's a deliberate,
// separate scope for a later change, not an oversight.

import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useEffect, useState } from 'react';

import { ListCategories } from '@components/category-management-dialog/list-categories';
import { ManageCategory } from '@components/category-management-dialog/manage-category';
import {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from '@serve/queries/categories';
import type { Category } from '@serve/types/global';
import { ApiError } from '@services/categories';

interface CategoryManagementDialogProps {
  open: boolean;
  householdId: number;
  householdName: string;
  onClose: () => void;
}

type Mode = 'list' | 'create' | 'edit';
type CategoryType = 'spending' | 'earning';

export function CategoryManagementDialog({
  open,
  householdId,
  householdName,
  onClose,
}: CategoryManagementDialogProps) {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('list');

  // ── List state ────────────────────────────────────────────────────────────
  // Shared with every other consumer of this household's categories — see
  // queries/categories.ts. Only active ones are shown here (see file
  // header); the picker-facing inactive ones live in the same cache entry.
  const categoriesQuery = useCategories(householdId, { enabled: open });
  const categories = (categoriesQuery.data ?? []).filter(c => c.is_active);

  // ── Form state (create / edit) ────────────────────────────────────────────
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('spending');
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCategory(householdId);
  const updateMutation = useUpdateCategory(householdId);
  const deactivateMutation = useDeactivateCategory(householdId);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deactivateMutation.isPending;

  // True for the duration of any create/edit/deactivate — see the
  // file-level comment on why every other action is disabled while so.
  const isMutating = isSaving || isDeleting;

  // This is a controlled dialog that can stay mounted across a household
  // switch while open (it doesn't unmount/remount on its own) — without
  // this, mode/editingCategory/the form fields would still refer to the
  // previous household: saving in edit mode would call updateCategory
  // with the old household's category id, and create could carry a stale
  // name/type into the new household.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('list');
    setEditingCategory(null);
    setName('');
    setType('spending');
    setFormError(null);
  }, [open, householdId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleClose() {
    // Guards the Dialog's own onClose (backdrop click / Escape) — its own
    // Close button is also wired to this, but list mode (where that
    // button lives) is never rendered while isMutating is true.
    if (isMutating) return;
    setMode('list');
    setEditingCategory(null);
    setName('');
    setType('spending');
    setFormError(null);
    onClose();
  }

  function openCreate() {
    setEditingCategory(null);
    setName('');
    setType('spending');
    setFormError(null);
    setMode('create');
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setFormError(null);
    setMode('edit');
  }

  function backToList() {
    setMode('list');
    setFormError(null);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Category name cannot be blank.');
      return;
    }

    setFormError(null);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({ name: trimmedName, type });
      } else if (mode === 'edit' && editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, payload: { name: trimmedName } });
      } else {
        return;
      }

      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save category.');
    }
  }

  async function handleDeactivate(categoryId: number) {
    setFormError(null);

    try {
      await deactivateMutation.mutateAsync(categoryId);
      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not deactivate category.');
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  const title =
    mode === 'create' ? 'New category' : mode === 'edit' ? 'Edit category' : `Categories — ${householdName}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>

      <DialogContent>
        {mode === 'list' && (
          <ListCategories
            categories={categories}
            isLoading={categoriesQuery.isLoading}
            error={categoriesQuery.isError ? 'Could not load categories. Please try again.' : null}
            onEdit={openEdit}
            onNewCategory={openCreate}
            onClose={handleClose}
          />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <ManageCategory
            mode={mode}
            editingCategory={editingCategory}
            name={name}
            type={type}
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={formError}
            onNameChange={setName}
            onTypeChange={setType}
            onSave={handleSave}
            onDeactivate={handleDeactivate}
            onBack={backToList}
            onDismissError={() => setFormError(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
