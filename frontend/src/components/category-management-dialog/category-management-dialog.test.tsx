// components/category-management-dialog/category-management-dialog.test.tsx
//
// Tests for the orchestration layer: mode transitions, API calls, and
// error propagation. Subcomponent rendering is covered in their own tests.
//
// No regression tests here for stale-response races (an initial list load
// that resolves after a mutation already landed, or a leftover fetch from
// a previous household leaking into a new one after a prop change) — that
// used to be hand-rolled state here (categoriesRef/categoriesVersionRef/
// fetchIdRef) and was tested accordingly, but it's now TanStack Query's
// job: queries are keyed by householdId, and it already guarantees only
// the latest request for a given key is ever applied.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryManagementDialog } from '@components/category-management-dialog';
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

// Needs its own QueryClient (the dialog reads categories via useCategories)
// — rerender re-wraps with the SAME client instance so a prop change (e.g.
// householdId) behaves like it would under the app's one long-lived client.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return {
    ...result,
    rerender: (nextUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
}

function setup(overrides: Partial<React.ComponentProps<typeof CategoryManagementDialog>> = {}) {
  const onClose = vi.fn();

  render(
    <CategoryManagementDialog
      open={true}
      householdId={1}
      householdName="Smith Household"
      onClose={onClose}
      {...overrides}
    />,
  );

  return { onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue(CATEGORIES);
});

describe('CategoryManagementDialog loading', () => {
  it('calls listCategories with the householdId (including inactive) on open', async () => {
    setup();
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1, true));
  });

  it('renders category names after loading', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Groceries')).toBeDefined());
    expect(screen.getByText('Salary')).toBeDefined();
  });

  it('omits inactive categories from the list', async () => {
    mockListCategories.mockResolvedValue([
      ...CATEGORIES,
      { id: 3, name: 'Old Rent', type: 'spending' as const, is_active: false, household_id: 1 },
    ]);
    setup();
    await waitFor(() => expect(screen.getByText('Groceries')).toBeDefined());
    expect(screen.queryByText('Old Rent')).toBeNull();
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

describe('CategoryManagementDialog switching households', () => {
  it('shows the new household\'s categories, not the previous one\'s, after householdId changes', async () => {
    mockListCategories.mockImplementation((householdId: number) =>
      Promise.resolve(householdId === 1 ? CATEGORIES : []),
    );
    const onClose = vi.fn();

    const { rerender } = render(
      <CategoryManagementDialog open={true} householdId={1} householdName="Smith Household" onClose={onClose} />,
    );
    await waitFor(() => screen.getByText('Groceries'));

    rerender(
      <CategoryManagementDialog open={true} householdId={2} householdName="Jones Household" onClose={onClose} />,
    );

    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(2, true));
    expect(screen.queryByText('Groceries')).toBeNull();
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

  it('shows the newly created category in the list after returning from create mode', async () => {
    const created = {
      id: 99,
      name: 'Utilities',
      type: 'spending' as const,
      is_active: true,
      household_id: 1,
    };
    mockListCategories.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce([...CATEGORIES, created]);
    mockCreateCategory.mockResolvedValueOnce(created);

    setup();
    await waitFor(() => screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: /new category/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Utilities' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Utilities')).toBeDefined();
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
    mockListCategories
      .mockResolvedValueOnce(CATEGORIES)
      .mockResolvedValueOnce(CATEGORIES.filter(c => c.id !== 1));
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
