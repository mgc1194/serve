// pages/budgets/category-management-dialog/category-management-dialog.test.tsx
//
// Tests for the orchestration layer: mode transitions, API calls, and
// error propagation. Subcomponent rendering is covered in their own tests.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryManagementDialog } from '@pages/budgets/category-management-dialog';
import { createCategory, deleteCategory, listCategories, updateCategory, ApiError } from '@services/categories';

vi.mock('@services/categories', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/categories')>();
  return {
    ...actual,
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  };
});

const mockListCategories = vi.mocked(listCategories);
const mockCreateCategory = vi.mocked(createCategory);
const mockUpdateCategory = vi.mocked(updateCategory);
const mockDeleteCategory = vi.mocked(deleteCategory);

const CATEGORIES = [
  { id: 1, name: 'Groceries', type: 'spending' as const, is_active: true, household_id: 1 },
  { id: 2, name: 'Salary', type: 'earning' as const, is_active: true, household_id: 1 },
];

function setup(overrides: Partial<React.ComponentProps<typeof CategoryManagementDialog>> = {}) {
  const onClose = vi.fn();
  const onCategoriesChanged = vi.fn();

  render(
    <CategoryManagementDialog
      open={true}
      householdId={1}
      householdName="Smith Household"
      onClose={onClose}
      onCategoriesChanged={onCategoriesChanged}
      {...overrides}
    />,
  );

  return { onClose, onCategoriesChanged };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue(CATEGORIES);
});

describe('CategoryManagementDialog loading', () => {
  it('calls listCategories with the householdId on open', async () => {
    setup();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1));
  });

  it('renders category names after loading', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Groceries')).toBeDefined());
    expect(screen.getByText('Salary')).toBeDefined();
  });

  it('shows error alert when listCategories fails', async () => {
    mockListCategories.mockRejectedValueOnce(new Error('Network error'));
    setup();
    await waitFor(() => expect(screen.getByText(/could not load categories/i)).toBeDefined());
  });

  it('does not call listCategories when open is false', () => {
    setup({ open: false });
    expect(mockListCategories).not.toHaveBeenCalled();
  });
});

describe('CategoryManagementDialog title', () => {
  it('shows household name in list mode title', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    expect(screen.getByText('Categories — Smith Household')).toBeDefined();
  });

  it('shows "New category" title after clicking New category', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    expect(screen.getByText('New category')).toBeDefined();
  });

  it('shows "Edit category" title after clicking the edit button', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect(screen.getByText('Edit category')).toBeDefined();
  });
});

describe('CategoryManagementDialog mode transitions', () => {
  it('switches to create mode when New category is clicked', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    expect(screen.getByLabelText(/^name$/i)).toBeDefined();
  });

  it('pre-fills form with category values in edit mode', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Groceries');
  });

  it('returns to list mode when Back is clicked', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('button', { name: /new category/i })).toBeDefined();
  });
});

describe('CategoryManagementDialog stale list responses', () => {
  it('discards (rather than applies) an initial list response that predates a create', async () => {
    let resolveInitialLoad: (categories: typeof CATEGORIES) => void = () => {};
    mockListCategories.mockReturnValueOnce(
      new Promise(resolve => {
        resolveInitialLoad = resolve;
      }),
    );
    const created = {
      id: 99,
      name: 'Utilities',
      type: 'spending' as const,
      is_active: true,
      household_id: 1,
    };
    mockCreateCategory.mockResolvedValueOnce(created);

    setup();

    // "New category" is available even while the initial fetch is still
    // loading — create one before that fetch resolves.
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // This resolves with a response that predates the create — applying
    // it directly would revert the create, so it must be discarded.
    await act(async () => {
      resolveInitialLoad(CATEGORIES);
    });

    expect(screen.getByText('Utilities')).toBeDefined();
    expect(mockListCategories).toHaveBeenCalledTimes(1);
  });

  it('does not surface a load error that arrives after a create already landed', async () => {
    let rejectInitialLoad: (err: Error) => void = () => {};
    mockListCategories.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectInitialLoad = reject;
      }),
    );
    const created = {
      id: 99,
      name: 'Utilities',
      type: 'spending' as const,
      is_active: true,
      household_id: 1,
    };
    mockCreateCategory.mockResolvedValueOnce(created);

    setup();

    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // The initial fetch fails, but only after the create already landed —
    // this failure isn't about anything the user did and the list is
    // already correct, so it must not be shown as a load error.
    await act(async () => {
      rejectInitialLoad(new Error('network blip'));
    });

    expect(screen.getByText('Utilities')).toBeDefined();
    expect(screen.queryByText(/could not load categories/i)).toBeNull();
  });
});

describe('CategoryManagementDialog switching households', () => {
  it('does not merge a new category onto the previous household\'s stale categories', async () => {
    mockListCategories.mockResolvedValueOnce(CATEGORIES);
    const onClose = vi.fn();
    const onCategoriesChanged = vi.fn();

    const { rerender } = render(
      <CategoryManagementDialog
        open={true}
        householdId={1}
        householdName="Smith Household"
        onClose={onClose}
        onCategoriesChanged={onCategoriesChanged}
      />,
    );
    await waitFor(() => screen.getByText('Groceries'));

    // The dialog stays mounted across a close/reopen for a different
    // household — its initial fetch for household 2 is still in flight.
    let resolveHousehold2Load: (categories: typeof CATEGORIES) => void = () => {};
    mockListCategories.mockReturnValueOnce(
      new Promise(resolve => {
        resolveHousehold2Load = resolve;
      }),
    );
    rerender(
      <CategoryManagementDialog
        open={true}
        householdId={2}
        householdName="Jones Household"
        onClose={onClose}
        onCategoriesChanged={onCategoriesChanged}
      />,
    );

    // "New category" stays enabled while household 2's fetch is loading —
    // create one before that fetch resolves.
    const created = {
      id: 99,
      name: 'Rent',
      type: 'spending' as const,
      is_active: true,
      household_id: 2,
    };
    mockCreateCategory.mockResolvedValueOnce(created);
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Rent' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // Household 2's own (real, predating-the-create) list response
    // resolves now — it must not overwrite the create, but the list is
    // still masked by the loading spinner until this settles.
    await act(async () => {
      resolveHousehold2Load([]);
    });

    // Household 1's Groceries/Salary must never leak into household 2's
    // list or its onCategoriesChanged report.
    expect(screen.queryByText('Groceries')).toBeNull();
    expect(screen.queryByText('Salary')).toBeNull();
    expect(screen.getByText('Rent')).toBeDefined();
    expect(onCategoriesChanged.mock.calls[0][0]).not.toContainEqual(
      expect.objectContaining({ name: 'Groceries' }),
    );
  });
});

describe('CategoryManagementDialog disables every other action during a mutation', () => {
  it('does not close on backdrop click while a create is saving', async () => {
    let resolveCreate: (category: {
      id: number;
      name: string;
      type: 'spending' | 'earning';
      is_active: boolean;
      household_id: number;
    }) => void = () => {};
    mockCreateCategory.mockReturnValueOnce(
      new Promise(resolve => {
        resolveCreate = resolve;
      }),
    );

    const { onClose } = setup();
    await waitFor(() => screen.getByText('Groceries'));

    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // Without this, the dialog could close (and later reopen) while the
    // create is still in flight — its late response would then land in
    // whatever session is open by then.
    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate({ id: 99, name: 'Utilities', type: 'spending', is_active: true, household_id: 1 });
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on backdrop click while a deactivate is in flight', async () => {
    let resolveDelete: () => void = () => {};
    mockDeleteCategory.mockReturnValueOnce(
      new Promise(resolve => {
        resolveDelete = resolve;
      }),
    );

    const { onClose } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(() => expect(mockDeleteCategory).toHaveBeenCalled());

    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveDelete();
    });
  });
});

describe('CategoryManagementDialog create', () => {
  it('calls createCategory with name, type, and householdId on save', async () => {
    mockCreateCategory.mockResolvedValueOnce({
      id: 99,
      name: 'Utilities',
      type: 'spending',
      is_active: true,
      household_id: 1,
    });

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: 'Utilities',
        type: 'spending',
        household_id: 1,
      }),
    );
  });

  it('calls onCategoriesChanged with active categories after successful create', async () => {
    const created = {
      id: 99,
      name: 'Utilities',
      type: 'spending' as const,
      is_active: true,
      household_id: 1,
    };
    mockCreateCategory.mockResolvedValueOnce(created);

    const { onCategoriesChanged } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(onCategoriesChanged).toHaveBeenCalled());
    expect(onCategoriesChanged.mock.calls[0][0]).toContainEqual(created);
  });

  it('shows error when createCategory throws an ApiError', async () => {
    mockCreateCategory.mockRejectedValueOnce(
      new ApiError(400, 'A category named "Groceries" already exists in this household.'),
    );

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Groceries' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeDefined());
  });
});

describe('CategoryManagementDialog edit', () => {
  it('calls updateCategory with the new name on save', async () => {
    mockUpdateCategory.mockResolvedValueOnce({ ...CATEGORIES[0], name: 'Food' });

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockUpdateCategory).toHaveBeenCalledWith(CATEGORIES[0].id, { name: 'Food' }),
    );
  });

  it('shows error when updateCategory throws', async () => {
    mockUpdateCategory.mockRejectedValueOnce(new ApiError(400, 'Name already taken.'));

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Salary' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText('Name already taken.')).toBeDefined());
  });
});

describe('CategoryManagementDialog deactivate', () => {
  it('calls deleteCategory when Deactivate → Yes is confirmed in edit mode', async () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => expect(mockDeleteCategory).toHaveBeenCalledWith(CATEGORIES[0].id));
  });

  it('removes the deactivated category from the list', async () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());
  });

  it('does not deactivate when No is clicked in the confirmation', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /edit groceries/i }));
    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));

    expect(mockDeleteCategory).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDefined();
  });
});


describe('CategoryManagementDialog close', () => {
  it('calls onClose when Close is clicked in list mode', async () => {
    const { onClose } = setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
