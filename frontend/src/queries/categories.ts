// queries/categories.ts — TanStack Query hooks for Category, backed by
// services/categories.ts's plain fetch functions.
//
// One cached list per household, always fetched with includeInactive —
// this is the only way a consumer that needs a since-deactivated category
// (the label picker, to display an existing assignment) can share a cache
// entry with one that only ever wants active ones (HouseholdCategoriesSection,
// CategoryManagementDialog's own list) instead of each causing its own
// network request; those simply filter the shared result down themselves.
// Every mutation invalidates the query instead of threading the result
// back up through callback props — every consumer on the page, however
// far from the mutation, re-renders with the fresh list on its own.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createCategory, deleteCategory, listCategories, updateCategory } from '@services/categories';

export function categoriesQueryKey(householdId: number) {
  return ['categories', householdId] as const;
}

export function useCategories(householdId: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: categoriesQueryKey(householdId),
    queryFn: () => listCategories(householdId, true),
    enabled: options.enabled ?? true,
  });
}

export function useCreateCategory(householdId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; type: 'earning' | 'spending' }) =>
      createCategory({ ...payload, household_id: householdId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey(householdId) }),
  });
}

export function useUpdateCategory(householdId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; is_active?: boolean } }) =>
      updateCategory(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey(householdId) }),
  });
}

export function useDeactivateCategory(householdId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => deleteCategory(categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey(householdId) }),
  });
}
