// queries/categories.test.ts

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeCategory } from '@serve/mocks';
import {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from '@serve/queries/categories';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@services/categories';

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

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue([]);
});

describe('useCategories', () => {
  it('fetches with includeInactive so the result can be shared by every consumer', async () => {
    const { result } = renderHook(() => useCategories(1), { wrapper: wrapper() });
    await waitFor(() => expect(mockListCategories).toHaveBeenCalledWith(1, true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() => useCategories(1, { enabled: false }), { wrapper: wrapper() });
    expect(mockListCategories).not.toHaveBeenCalled();
  });

  it('does not refetch for a second observer mounting shortly after the first', async () => {
    // The exact scenario a zero staleTime would cause: a section has
    // already loaded this household's categories, then a dialog opens
    // and mounts its own useCategories — without a staleTime, that
    // second observer would refetch even though nothing invalidated it.
    const Wrapper = wrapper();
    const { result: first } = renderHook(() => useCategories(1), { wrapper: Wrapper });
    await waitFor(() => expect(first.current.isSuccess).toBe(true));
    expect(mockListCategories).toHaveBeenCalledTimes(1);

    renderHook(() => useCategories(1), { wrapper: Wrapper });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockListCategories).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateCategory', () => {
  it('calls createCategory with the householdId merged in', async () => {
    mockCreateCategory.mockResolvedValue(makeCategory({ id: 2, name: 'Rent' }));
    const { result } = renderHook(() => useCreateCategory(1), { wrapper: wrapper() });

    result.current.mutate({ name: 'Rent', type: 'spending' });

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'Rent', type: 'spending', household_id: 1 }),
    );
  });

  it('invalidates the categories query for this household on success', async () => {
    mockCreateCategory.mockResolvedValue(makeCategory({ id: 2, name: 'Rent' }));
    const Wrapper = wrapper();
    const { result: query } = renderHook(() => useCategories(1), { wrapper: Wrapper });
    await waitFor(() => expect(query.current.isSuccess).toBe(true));
    expect(mockListCategories).toHaveBeenCalledTimes(1);

    const { result: mutation } = renderHook(() => useCreateCategory(1), { wrapper: Wrapper });
    mutation.current.mutate({ name: 'Rent', type: 'spending' });

    await waitFor(() => expect(mockListCategories).toHaveBeenCalledTimes(2));
  });
});

describe('useUpdateCategory', () => {
  it('calls updateCategory with the given id and payload', async () => {
    mockUpdateCategory.mockResolvedValue(makeCategory({ id: 1, name: 'Groceries & Essentials' }));
    const { result } = renderHook(() => useUpdateCategory(1), { wrapper: wrapper() });

    result.current.mutate({ id: 1, payload: { name: 'Groceries & Essentials' } });

    await waitFor(() =>
      expect(mockUpdateCategory).toHaveBeenCalledWith(1, { name: 'Groceries & Essentials' }),
    );
  });
});

describe('useDeactivateCategory', () => {
  it('calls deleteCategory with the given id', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeactivateCategory(1), { wrapper: wrapper() });

    result.current.mutate(5);

    await waitFor(() => expect(mockDeleteCategory).toHaveBeenCalledWith(5));
  });
});
