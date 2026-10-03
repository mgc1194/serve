// pages/budgets/category-management-dialog/index.tsx
//
// Orchestrates the category management dialog: owns all state, handles API
// calls, and delegates rendering to ListCategories (list mode) and
// ManageCategory (create / edit mode). Mirrors
// households/label-management-dialog's shape.
//
// "New category" stays available even while the initial (or a show-inactive
// toggle's) list fetch is still loading, so a create/edit/deactivate/
// reactivate can complete before that fetch resolves. Its eventual response
// then predates the mutation and must not be allowed to overwrite it — every
// write to `categories` goes through writeCategories, which bumps
// categoriesVersionRef, so a fetch only applies its result if no write
// happened since it started. A stale response is never just dropped, though
// — it can carry data the mutation has no way to know about (e.g. the
// inactive categories a Show-inactive fetch alone would return), so instead
// of being discarded wholesale, the same request is simply re-issued; by
// then the mutation is already committed server-side, so the next response
// reflects both. fetchIdRef is the separate, simpler generation guard for
// isLoading/listError, so only the most recently started fetch (not an
// unrelated mutation) controls those — see the effect below for both.

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
  const [showInactive, setShowInactive] = useState(false);
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

  // loadCategoriesRef gives handleToggleShowInactive a stable reference to
  // the effect's loadCategories without making it a useEffect dependency.
  const loadCategoriesRef = useRef<(includeInactive: boolean) => void>(() => {});

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
    let ignore = false;

    function loadCategories(includeInactive: boolean) {
      const fetchId = ++fetchIdRef.current;
      const versionAtStart = categoriesVersionRef.current;
      setIsLoading(true);
      setListError(null);
      listCategories(householdId, includeInactive)
        .then(result => {
          if (ignore || fetchId !== fetchIdRef.current) return;
          if (categoriesVersionRef.current !== versionAtStart) {
            // A mutation wrote `categories` after this fetch started — this
            // result predates that write, so applying it now would revert
            // it. But it may be the only response that reflects this
            // request's own filter (e.g. include_inactive), so re-issue it
            // rather than dropping it — the mutation is already committed
            // server-side by now, so the next response reflects both.
            loadCategories(includeInactive);
            return;
          }
          writeCategories(result);
        })
        .catch(() => {
          if (ignore || fetchId !== fetchIdRef.current) return;
          setListError('Could not load categories. Please try again.');
        })
        .finally(() => {
          if (ignore || fetchId !== fetchIdRef.current) return;
          setIsLoading(false);
        });
    }

    loadCategoriesRef.current = loadCategories;
    // Resets mode and kicks off a network fetch; loading/error state must
    // flip synchronously before it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode('list');
    setShowInactive(false);
    loadCategories(false);

    return () => {
      ignore = true;
    };
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
    loadCategoriesRef.current(next);
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
      const nextCategories = showInactive
        ? categoriesRef.current.map(c => (c.id === categoryId ? { ...c, is_active: false } : c))
        : categoriesRef.current.filter(c => c.id !== categoryId);
      writeCategories(nextCategories);
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
      const nextCategories = categoriesRef.current.map(c => (c.id === categoryId ? updated : c));
      writeCategories(nextCategories);
      onCategoriesChanged(nextCategories.filter(c => c.is_active));
    } catch {
      setListError('Could not reactivate category. Please try again.');
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
