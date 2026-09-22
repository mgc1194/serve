// pages/budgets/category-management-dialog/index.tsx
//
// Orchestrates the category management dialog: owns all state, handles API
// calls, and delegates rendering to ListCategories (list mode) and
// ManageCategory (create / edit mode). Mirrors
// households/label-management-dialog's shape.

import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useEffect, useState } from 'react';

import { ListCategories } from '@pages/budgets/category-management-dialog/list-categories';
import { ManageCategory } from '@pages/budgets/category-management-dialog/manage-category';
import type { Category, Label } from '@serve/types/global';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  ApiError,
} from '@services/categories';
import { listLabels, updateLabel, ApiError as LabelsApiError } from '@services/labels';

interface CategoryManagementDialogProps {
  open: boolean;
  householdId: number;
  householdName: string;
  onClose: () => void;
  onCategoriesChanged: (categories: Category[]) => void;
}

type Mode = 'list' | 'create' | 'edit';
type CategoryType = 'spending' | 'earning';

export function CategoryManagementDialog({
  open,
  householdId,
  householdName,
  onClose,
  onCategoriesChanged,
}: CategoryManagementDialogProps) {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('list');

  // ── List state ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Form state (create / edit) ────────────────────────────────────────────
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('spending');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load on open; reset mode and filters each time ───────────────────────
  useEffect(() => {
    if (!open) return;
    // Resets mode and kicks off a network fetch; loading/error state must
    // flip synchronously before it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('list');
    setShowInactive(false);
    setIsLoading(true);
    setListError(null);
    Promise.all([listCategories(householdId, false), listLabels(householdId)])
      .then(([cats, lbls]) => {
        setCategories(cats);
        setLabels(lbls);
      })
      .catch(() => setListError('Could not load categories. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [open, householdId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleClose() {
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

  function handleToggleShowInactive(next: boolean) {
    setShowInactive(next);
    setIsLoading(true);
    setListError(null);
    Promise.all([listCategories(householdId, next), listLabels(householdId)])
      .then(([cats, lbls]) => {
        setCategories(cats);
        setLabels(lbls);
      })
      .catch(() => setListError('Could not load categories. Please try again.'))
      .finally(() => setIsLoading(false));
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Category name cannot be blank.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      let nextCategories: Category[];
      if (mode === 'create') {
        const created = await createCategory({
          name: trimmedName,
          type,
          household_id: householdId,
        });
        nextCategories = [...categories, created];
      } else if (mode === 'edit' && editingCategory) {
        const updated = await updateCategory(editingCategory.id, { name: trimmedName });
        nextCategories = categories.map(c => (c.id === updated.id ? updated : c));
      } else {
        return;
      }

      setCategories(nextCategories);
      onCategoriesChanged(nextCategories.filter(c => c.is_active));
      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(categoryId: number) {
    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteCategory(categoryId);
      const nextCategories = showInactive
        ? categories.map(c => (c.id === categoryId ? { ...c, is_active: false } : c))
        : categories.filter(c => c.id !== categoryId);
      setCategories(nextCategories);
      onCategoriesChanged(nextCategories.filter(c => c.is_active));
      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not deactivate category.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleReactivate(categoryId: number) {
    setListError(null);
    try {
      const updated = await updateCategory(categoryId, { is_active: true });
      const nextCategories = categories.map(c => (c.id === categoryId ? updated : c));
      setCategories(nextCategories);
      onCategoriesChanged(nextCategories.filter(c => c.is_active));
    } catch {
      setListError('Could not reactivate category. Please try again.');
    }
  }

  async function handleToggleLabel(labelId: number, checked: boolean) {
    if (!editingCategory) return;
    try {
      const updated = await updateLabel(labelId, {
        category_id: checked ? editingCategory.id : null,
      });
      setLabels(prev => prev.map(l => (l.id === labelId ? updated : l)));
    } catch (err) {
      setFormError(err instanceof LabelsApiError ? err.message : 'Could not update label.');
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  const title =
    mode === 'create'
      ? 'New category'
      : mode === 'edit'
      ? 'Edit category'
      : `Categories — ${householdName}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>

      <DialogContent>
        {mode === 'list' && (
          <ListCategories
            categories={categories}
            isLoading={isLoading}
            error={listError}
            showInactive={showInactive}
            onToggleShowInactive={handleToggleShowInactive}
            onEdit={openEdit}
            onReactivate={handleReactivate}
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
            labels={labels}
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={formError}
            onNameChange={setName}
            onTypeChange={setType}
            onSave={handleSave}
            onDeactivate={handleDeactivate}
            onToggleLabel={handleToggleLabel}
            onBack={backToList}
            onDismissError={() => setFormError(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
