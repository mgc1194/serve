// components/label-management-dialog/index.tsx
//
// Orchestrates the label management dialog: owns all state, handles API calls,
// and delegates rendering to ListLabels (list mode) and ManageLabel
// (create / edit mode). categories (for ManageLabel's category picker) is
// the one exception to "owns all state" — it's fetched once by the
// household card and passed in, rather than fetched here too.

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { ListLabels } from '@components/label-management-dialog/list-labels';
import { ManageLabel } from '@components/label-management-dialog/manage-label';
import type { Category, Label } from '@serve/types/global';
import { createLabel, deleteLabel, listLabels, updateLabel, ApiError } from '@services/labels';

interface LabelManagementDialogProps {
  open: boolean;
  householdId: number;
  householdName: string;
  /** Open the dialog directly into create mode (e.g. from the "Add label" button). */
  initialMode?: 'list' | 'create';
  /**
   * The household's categories (active and inactive — see ManageLabel's
   * own comment on why inactive ones must stay in this list) for the
   * category picker. Owned and fetched by the household card, not this
   * dialog, so it's shared with HouseholdCategoriesSection instead of
   * being fetched twice.
   */
  categories: Category[];
  onClose: () => void;
  onLabelsChanged: (labels: Label[]) => void;
}

type Mode = 'list' | 'create' | 'edit';

const DEFAULT_COLOR = '#6B7280';

export function LabelManagementDialog({
  open,
  householdId,
  householdName,
  initialMode = 'list',
  categories,
  onClose,
  onLabelsChanged,
}: LabelManagementDialogProps) {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>(initialMode);

  // ── List state ────────────────────────────────────────────────────────────
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Form state (create / edit) ────────────────────────────────────────────
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load on open; reset mode to initialMode each time ────────────────────
  useEffect(() => {
    if (!open) return;
    let ignore = false;

    // Resets mode and kicks off a network fetch; loading/error state must
    // flip synchronously before it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode);
    setIsLoading(true);
    setListError(null);
    listLabels(householdId)
      .then(result => {
        if (ignore) return;
        setLabels(result);
      })
      .catch(() => {
        if (ignore) return;
        setListError('Could not load labels. Please try again.');
      })
      .finally(() => {
        if (ignore) return;
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, householdId, initialMode]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleClose() {
    setMode('list');
    setEditingLabel(null);
    setName('');
    setColor(DEFAULT_COLOR);
    setCategoryId(null);
    setFormError(null);
    onClose();
  }

  function openCreate() {
    setEditingLabel(null);
    setName('');
    setColor(DEFAULT_COLOR);
    setCategoryId(null);
    setFormError(null);
    setMode('create');
  }

  function openEdit(label: Label) {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setCategoryId(label.category_id);
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
      setFormError('Label name cannot be blank.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (mode === 'create') {
        const created = await createLabel({
          name: trimmedName,
          color,
          category_id: categoryId,
          household_id: householdId,
        });

        const updated = [...labels, created];
        setLabels(updated);
        onLabelsChanged(updated);
      } else if (mode === 'edit' && editingLabel) {
        const updated = await updateLabel(editingLabel.id, { name: trimmedName, color, category_id: categoryId });
        const updatedList = labels.map(l => (l.id === updated.id ? updated : l));
        setLabels(updatedList);
        onLabelsChanged(updatedList);
      }

      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save label.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(labelId: number) {
    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteLabel(labelId);
      const updatedList = labels.filter(l => l.id !== labelId);
      setLabels(updatedList);
      onLabelsChanged(updatedList);
      backToList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not delete label.');
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  const title =
    mode === 'create'
      ? 'New label'
      : mode === 'edit'
      ? 'Edit label'
      : `Labels — ${householdName}`;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>

      <DialogContent>
        {mode === 'list' && (
          <ListLabels
            labels={labels}
            isLoading={isLoading}
            error={listError}
            onEdit={openEdit}
            onNewLabel={openCreate}
            onClose={handleClose}
          />
        )}

        {(mode === 'create' || mode === 'edit') && (
          <ManageLabel
            mode={mode}
            editingLabel={editingLabel}
            name={name}
            color={color}
            categories={categories}
            categoryId={categoryId}
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={formError}
            onNameChange={setName}
            onColorChange={setColor}
            onCategoryChange={setCategoryId}
            onSave={handleSave}
            onDelete={handleDelete}
            onBack={backToList}
            onDismissError={() => setFormError(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
