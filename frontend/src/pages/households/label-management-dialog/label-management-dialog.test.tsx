// pages/households/label-management-dialog/label-management-dialog.test.tsx
//
// Tests for the orchestration layer: mode transitions, API calls, and
// error propagation. Subcomponent rendering is covered in their own tests.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LabelManagementDialog } from '@pages/households/label-management-dialog';
import {
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
  ApiError,
} from '@services/labels';

vi.mock('@services/labels', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/labels')>();
  return {
    ...actual,
    listLabels: vi.fn(),
    createLabel: vi.fn(),
    updateLabel: vi.fn(),
    deleteLabel: vi.fn(),
  };
});

const mockListLabels = vi.mocked(listLabels);
const mockCreateLabel = vi.mocked(createLabel);
const mockUpdateLabel = vi.mocked(updateLabel);
const mockDeleteLabel = vi.mocked(deleteLabel);

const LABELS = [
  { id: 1, name: 'Groceries', color: '#16a34a', category: '', household_id: 1 },
  { id: 2, name: 'Transport', color: '#2563eb', category: '', household_id: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof LabelManagementDialog>> = {}) {
  const onClose = vi.fn();
  const onLabelsChanged = vi.fn();

  render(
    <LabelManagementDialog
      open={true}
      householdId={1}
      householdName="Smith Household"
      onClose={onClose}
      onLabelsChanged={onLabelsChanged}
      {...overrides}
    />,
  );

  return { onClose, onLabelsChanged };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListLabels.mockResolvedValue(LABELS);
});

// ── Loading ────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog loading', () => {
  it('calls listLabels with the householdId on open', async () => {
    setup();
    await waitFor(() => expect(mockListLabels).toHaveBeenCalledWith(1));
  });

  it('renders label chips after loading', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Groceries')).toBeDefined());
    expect(screen.getByText('Transport')).toBeDefined();
  });

  it('shows error alert when listLabels fails', async () => {
    mockListLabels.mockRejectedValueOnce(new Error('Network error'));
    setup();
    await waitFor(() =>
      expect(screen.getByText(/could not load labels/i)).toBeDefined(),
    );
  });

  it('does not call listLabels when open is false', () => {
    setup({ open: false });
    expect(mockListLabels).not.toHaveBeenCalled();
  });
});

// ── Title ──────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog title', () => {
  it('shows household name in list mode title', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    expect(screen.getByText('Labels — Smith Household')).toBeDefined();
  });

  it('shows "New label" title after clicking New label', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    expect(screen.getByText('New label')).toBeDefined();
  });

  it('shows "Edit label" title after clicking the edit button', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect(screen.getByText('Edit label')).toBeDefined();
  });
});

// ── Mode transitions ───────────────────────────────────────────────────────────

describe('LabelManagementDialog mode transitions', () => {
  it('switches to create mode when New label is clicked', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    expect(screen.getByLabelText(/^name$/i)).toBeDefined();
  });

  it('switches to edit mode when an edit button is clicked', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
  });

  it('pre-fills form with label values in edit mode', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Groceries');
    expect((screen.getByLabelText(/^color$/i) as HTMLInputElement).value).toBe('#16a34a');
  });

  it('returns to list mode when Back is clicked', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('button', { name: /new label/i })).toBeDefined();
  });

  it('resets form fields when switching from edit to create', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Groceries');
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('');
  });
});

// ── Create ─────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog create', () => {
  it('calls createLabel with name, color, and householdId on save', async () => {
    mockCreateLabel.mockResolvedValueOnce(
      { id: 99, name: 'Bills', color: '#6B7280', category: '', household_id: 1 },
    );

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Bills' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateLabel).toHaveBeenCalledWith({
        name: 'Bills',
        color: '#6B7280',
        category: '',
        household_id: 1,
      }),
    );
  });

  it('calls onLabelsChanged after successful create', async () => {
    const newLabel = { id: 99, name: 'Bills', color: '#6B7280', category: '', household_id: 1 };
    mockCreateLabel.mockResolvedValueOnce(newLabel);

    const { onLabelsChanged } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Bills' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(onLabelsChanged).toHaveBeenCalled());
    expect(onLabelsChanged.mock.calls[0][0]).toContainEqual(newLabel);
  });

  it('returns to list mode after successful create', async () => {
    mockCreateLabel.mockResolvedValueOnce(
      { id: 99, name: 'Bills', color: '#6B7280', category: '', household_id: 1 },
    );

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Bills' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /new label/i })).toBeDefined(),
    );
  });

  it('shows error when createLabel throws an ApiError', async () => {
    mockCreateLabel.mockRejectedValueOnce(new ApiError(400, 'A label named "Groceries" already exists in this household.'));

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new label/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Groceries' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(screen.getByText(/already exists/i)).toBeDefined(),
    );
  });
});

// ── Edit ───────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog edit', () => {
  it('calls updateLabel with new name and color on save', async () => {
    mockUpdateLabel.mockResolvedValueOnce({ ...LABELS[0], name: 'Food', color: '#dc2626' });

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Food' } });
    fireEvent.change(screen.getByLabelText(/^color$/i), { target: { value: '#dc2626' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockUpdateLabel).toHaveBeenCalledWith(LABELS[0].id, {
        name: 'Food',
        color: '#dc2626',
      }),
    );
  });

  it('calls onLabelsChanged after successful edit', async () => {
    mockUpdateLabel.mockResolvedValueOnce({ ...LABELS[0], name: 'Food' });

    const { onLabelsChanged } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onLabelsChanged).toHaveBeenCalled());
  });

  it('returns to list mode after successful edit', async () => {
    mockUpdateLabel.mockResolvedValueOnce({ ...LABELS[0], name: 'Food' });

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /new label/i })).toBeDefined(),
    );
  });

  it('shows error when updateLabel throws', async () => {
    mockUpdateLabel.mockRejectedValueOnce(new ApiError(400, 'Name already taken.'));

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Transport' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText('Name already taken.')).toBeDefined(),
    );
  });
});

// ── Delete ─────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog delete', () => {
  it('calls deleteLabel when Delete → Yes is confirmed in edit mode', async () => {
    mockDeleteLabel.mockResolvedValueOnce(undefined);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => expect(mockDeleteLabel).toHaveBeenCalledWith(LABELS[0].id));
  });

  it('removes the deleted label from the list', async () => {
    mockDeleteLabel.mockResolvedValueOnce(undefined);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());
  });

  it('calls onLabelsChanged after delete', async () => {
    mockDeleteLabel.mockResolvedValueOnce(undefined);

    const { onLabelsChanged } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => expect(onLabelsChanged).toHaveBeenCalled());
  });

  it('returns to list mode after delete', async () => {
    mockDeleteLabel.mockResolvedValueOnce(undefined);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /new label/i })).toBeDefined(),
    );
  });

  it('does not delete when No is clicked in the confirmation', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));

    expect(mockDeleteLabel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
  });

  it('shows error when deleteLabel throws', async () => {
    mockDeleteLabel.mockRejectedValueOnce(new ApiError(500, 'Could not delete label.'));

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.getByText('Could not delete label.')).toBeDefined(),
    );
  });
});

// ── Close ──────────────────────────────────────────────────────────────────────

describe('LabelManagementDialog close', () => {
  it('calls onClose when Close is clicked in list mode', async () => {
    const { onClose } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
