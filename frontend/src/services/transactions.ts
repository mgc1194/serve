// services/transactions.ts — Typed fetch functions for transaction endpoints.

import type {
  FileImportResult,
  PaginatedTransactions,
  SortDir,
  SortField,
  Transaction,
} from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export interface ListTransactionsParams {
  household_id: number;
  account_id?: number;
  cursor?: string;
  previous_cursor?: string;
  sort?: SortField;
  sort_dir?: SortDir;
}

export async function listTransactions(
  params: ListTransactionsParams,
): Promise<PaginatedTransactions> {
  const query = new URLSearchParams();
  query.set('household_id', String(params.household_id));
  if (params.account_id != null) query.set('account_id', String(params.account_id));
  if (params.cursor != null) query.set('cursor', params.cursor);
  if (params.previous_cursor != null) query.set('previous_cursor', params.previous_cursor);
  if (params.sort != null) query.set('sort', params.sort);
  if (params.sort_dir != null) query.set('sort_dir', params.sort_dir);
  return apiFetch<PaginatedTransactions>(`/transactions/?${query.toString()}`);
}

export async function updateTransactionConcept(
  id: number,
  concept: string,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ concept }),
  });
}

export async function updateTransactionLabel(
  id: number,
  labelId: number | null,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ label_id: labelId }),
  });
}

export async function toggleTransactionExclusion(
  id: number,
  exclude: boolean,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ exclude_from_summary: exclude }),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  return apiFetch<void>(`/transactions/${id}/`, { method: 'DELETE' });
}

export async function importTransactionsCsv(
  accountId: number,
  file: File,
): Promise<FileImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  const { API_V1 } = await import('@serve/config');
  const response = await fetch(
    `${API_V1}/transactions/import?account_id=${accountId}`,
    {
      method: 'POST',
      headers: { 'X-CSRFToken': csrfToken },
      credentials: 'include',
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: 'An unexpected error occurred.' }));
    throw new ApiError(response.status, body.detail ?? 'An unexpected error occurred.');
  }

  return response.json() as Promise<FileImportResult>;
}
