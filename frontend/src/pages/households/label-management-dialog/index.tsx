// pages/households/label-management-dialog/index.tsx
//
// Orchestrates the label management dialog: owns all state, handles API calls,
// and delegates rendering to ListLabels (list mode) and ManageLabel
// (create / edit mode).

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { ListLabels } from '@pages/households/label-management-dialog/list-labels';
import { ManageLabel } from '@pages/households/label-management-dialog/manage-label';
import type { Label } from '@serve/types/global';
import { createLabels, deleteLabel, listLabels, updateLabel, ApiError } from '@services/labels';

interface LabelManagementDialogProps {
  open: boolean;
  householdId: number;
  householdName: string;
  onClose: () => void;
  onLabelsChanged: (labels: Label[]) => void;
}

type Mode = 'list' | 'create' | 'edit';

const DEFAULT_COLOR = '#6B7280';

export function LabelManagementDialog({
  open,
  householdId,
  householdName,
  onClose,
  onLabelsChanged,
}: LabelManagementDialogProps) {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('list');

  // ── List state ────────────────────────────────────────────────────────────
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Form state (create / edit) ────────────────────────────────────────────
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setListError(null);
    listLabels(householdId)
      .then(setLabels)
      .catch(() => setListError('Could not load labels. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [open, householdId]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleClose() {
    setMode('list');
    setEditingLabel(null);
    setName('');
    setColor(DEFAULT_COLOR);
    setFormError(null);
    onClose();
  }

  function openCreate() {
    setEditingLabel(null);
    setName('');
    setColor(DEFAULT_COLOR);
    setFormError(null);
    setMode('create');
  }

  function openEdit(label: Label) {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
    setFormError(null);
    setMode('edit');
  }

  function backToList() {
    setMode('list');
    setFormError(null);
  }

  // ── API actions ───────────────────────────────────────────────────────────
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
        const result = await createLabels({
          name: trimmedName,
          color,
          category: '',
          household_ids: [householdId],
        });

        if (result.failed.length > 0) {
          setFormError(result.failed[0].reason);
          return;
        }

        const updated = [...labels, ...result.created];
        setLabels(updated);
        onLabelsChanged(updated);
      } else if (mode === 'edit' && editingLabel) {
        const updated = await updateLabel(editingLabel.id, { name: trimmedName, color });
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

      <DialogContent sx={{ pt: 2 }}>
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
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={formError}
            onNameChange={setName}
            onColorChange={setColor}
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
