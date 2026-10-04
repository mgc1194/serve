// pages/budgets/category-management-dialog/index.tsx
//
// Orchestrates the category management dialog: owns all state, handles API
// calls, and delegates rendering to ListCategories (list mode) and
// ManageCategory (create / edit mode). Mirrors
// households/label-management-dialog's shape.
//
// "New category" stays available even while the initial list fetch is
// still loading, so a create/edit/deactivate can complete before that
// fetch resolves. Its eventual response then predates the mutation and
// must not be allowed to overwrite it — every write to `categories` goes
// through writeCategories, which bumps categoriesVersionRef, so the fetch
// only applies its result if no write happened since it started;
// otherwise it's simply discarded, since the mutation's own optimistic
// update already reflects the current state. fetchIdRef is the separate,
// simpler generation guard for isLoading/listError, so only the most
// recently started fetch controls those.
//
// isMutating guards the Dialog's own onClose (backdrop click / Escape —
// ManageCategory's own isSaving/isDeleting already disable its Back
// button) for the duration of a create/edit/deactivate, so the dialog
// can't be closed and reopened while one is in flight. Each handler can
// then apply its result directly against whatever's currently loaded
// with no staleness guard of its own — list mode (and ListCategories'
// Close/New category/Edit controls) is never even rendered while a
// mutation is running, since handleSave/handleDeactivate are only
// reachable from ManageCategory's create/edit mode.
//
// Deactivated categories aren't otherwise exposed anywhere in this dialog
// yet (no "show inactive" view, no reactivate) — that's a deliberate,
// separate scope for a later change, not an oversight.

import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { ListCategories } from '@pages/budgets/category-management-dialog/list-categories';
import { ManageCategory } from '@pages/budgets/category-management-dialog/manage-category';
import type { Category } from '@serve/types/global';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  ApiError,
} from '@services/categories';

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
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // categoriesRef mirrors `categories` synchronously (see writeCategories),
  // so a mutation handler can read the latest list without risking a stale
  // closure over `categories` from the render it was called in.
  const categoriesRef = useRef<Category[]>([]);
  const categoriesVersionRef = useRef(0);
  const fetchIdRef = useRef(0);

  function writeCategories(next: Category[]) {
    categoriesVersionRef.current += 1;
    categoriesRef.current = next;
    setCategories(next);
  }

  // ── Form state (create / edit) ────────────────────────────────────────────
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('spending');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // True for the duration of any create/edit/deactivate — see the
  // file-level comment on why every other action is disabled while so.
  const isMutating = isSaving || isDeleting;

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const fetchId = ++fetchIdRef.current;
    const versionAtStart = categoriesVersionRef.current;

    // Resets mode; loading/error state must flip synchronously before the
    // fetch below resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('list');
    setIsLoading(true);
    setListError(null);
    listCategories(householdId)
      .then(result => {
        if (ignore || fetchId !== fetchIdRef.current) return;
        // A mutation already wrote `categories` after this fetch started —
        // this result predates that write and would revert it if applied,
        // so it's discarded; the mutation's own optimistic update already
        // reflects the current state.
        if (categoriesVersionRef.current !== versionAtStart) return;
        writeCategories(result);
      })
      .catch(() => {
        if (ignore || fetchId !== fetchIdRef.current) return;
        // Same reasoning as above: a mutation already landed, so this
        // failure isn't about anything the user did and the list is
        // already correct — surfacing it would be misleading.
        if (categoriesVersionRef.current !== versionAtStart) return;
        setListError('Could not load categories. Please try again.');
      })
      .finally(() => {
        if (ignore || fetchId !== fetchIdRef.current) return;
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
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
        nextCategories = [...categoriesRef.current, created];
      } else if (mode === 'edit' && editingCategory) {
        const updated = await updateCategory(editingCategory.id, { name: trimmedName });
        nextCategories = categoriesRef.current.map(c => (c.id === updated.id ? updated : c));
      } else {
        return;
      }

      writeCategories(nextCategories);
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
      const nextCategories = categoriesRef.current.filter(c => c.id !== categoryId);
      writeCategories(nextCategories);
      onCategoriesChanged(nextCategories.filter(c => c.is_active));
      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not deactivate category.');
    } finally {
      setIsDeleting(false);
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
            isLoading={isLoading}
            error={listError}
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
