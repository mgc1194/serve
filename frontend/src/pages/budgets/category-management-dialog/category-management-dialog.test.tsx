// pages/budgets/category-management-dialog/category-management-dialog.test.tsx
//
// Tests for the orchestration layer: mode transitions, API calls, and
// error propagation. Subcomponent rendering is covered in their own tests.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1, false));
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
  it('keeps a newly created category visible when the initial list fetch resolves afterward with a response that predates it', async () => {
    let resolveInitialLoad: (categories: typeof CATEGORIES) => void = () => {};
    mockListCategories.mockReturnValueOnce(
      new Promise(resolve => {
        resolveInitialLoad = resolve;
      }),
    );
    mockCreateCategory.mockResolvedValueOnce({
      id: 99,
      name: 'Utilities',
      type: 'spending',
      is_active: true,
      household_id: 1,
    });

    setup();

    // "New category" is available even while the initial fetch is still
    // loading — create one before that fetch resolves. The dialog is still
    // showing its loading spinner at this point (isLoading only clears once
    // the fetch itself settles), so "Utilities" isn't visible yet either way.
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // The initial fetch (started before the create) now resolves with a
    // response that doesn't include the just-created category — it must be
    // discarded as stale rather than overwriting the create.
    resolveInitialLoad(CATEGORIES);

    await waitFor(() => expect(screen.getByText('Utilities')).toBeDefined());
  });

  it('keeps a newly created category visible when a show-inactive toggle\'s list fetch resolves afterward with a response that predates it', async () => {
    mockListCategories.mockResolvedValueOnce(CATEGORIES);
    let resolveToggleLoad: (categories: typeof CATEGORIES) => void = () => {};
    mockListCategories.mockReturnValueOnce(
      new Promise(resolve => {
        resolveToggleLoad = resolve;
      }),
    );
    mockCreateCategory.mockResolvedValueOnce({
      id: 99,
      name: 'Utilities',
      type: 'spending',
      is_active: true,
      household_id: 1,
    });

    setup();
    await waitFor(() => screen.getByText('Groceries'));

    // Toggling "Show inactive" kicks off a second fetch; create a category
    // before that fetch resolves.
    fireEvent.click(screen.getByRole('checkbox', { name: /show inactive/i }));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));
    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalled());

    // The toggle's fetch (started before the create) now resolves with a
    // response that doesn't include the just-created category — it must be
    // discarded as stale rather than overwriting the create. Unlike the
    // initial-load case above, the pre-toggle list already loaded
    // successfully, so Groceries should still be visible alongside it.
    resolveToggleLoad(CATEGORIES);
    await waitFor(() => expect(screen.getByText('Utilities')).toBeDefined());
    expect(screen.getByText('Groceries')).toBeDefined();
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

  it('removes the deactivated category from the (active-only) list', async () => {
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

describe('CategoryManagementDialog reactivate', () => {
  it('calls listCategories with include_inactive=true when Show inactive is toggled', async () => {
    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('checkbox', { name: /show inactive/i }));

    await waitFor(() => expect(mockListCategories).toHaveBeenLastCalledWith(1, true));
  });

  it('calls updateCategory with is_active: true when Reactivate is clicked', async () => {
    mockListCategories.mockResolvedValue([
      ...CATEGORIES,
      { id: 3, name: 'Old', type: 'spending' as const, is_active: false, household_id: 1 },
    ]);
    mockUpdateCategory.mockResolvedValueOnce({
      id: 3,
      name: 'Old',
      type: 'spending',
      is_active: true,
      household_id: 1,
    });

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('checkbox', { name: /show inactive/i }));
    await waitFor(() => screen.getByText('Old'));
    fireEvent.click(screen.getByRole('button', { name: /reactivate/i }));

    await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledWith(3, { is_active: true }));
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
