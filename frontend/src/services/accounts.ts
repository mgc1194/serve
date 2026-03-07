// services/accounts.ts — Typed fetch functions for account endpoints.

import type { AccountDetail, Bank } from '@serve/types/global';
import { apiFetch, ApiError } from '@services/api-client';

export { ApiError };

export type SortField = 'bank' | 'name' | 'household' | 'created_at';

export interface ListAccountsParams {
  household_id?: number;
  bank_id?: number;
  sort?: SortField;
}

export async function listAccounts(params: ListAccountsParams = {}): Promise<AccountDetail[]> {
  const query = new URLSearchParams();
  if (params.household_id != null) query.set('household_id', String(params.household_id));
  if (params.bank_id != null) query.set('bank_id', String(params.bank_id));
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiFetch<AccountDetail[]>(`/accounts/${qs ? `?${qs}` : ''}`);
}

export async function createAccount(payload: {
  household_id: number;
  account_type_id: number;
  name: string;
}): Promise<AccountDetail> {
  return apiFetch<AccountDetail>('/accounts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function renameAccount(id: number, name: string): Promise<AccountDetail> {
  return apiFetch<AccountDetail>(`/accounts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteAccount(id: number): Promise<void> {
  return apiFetch<void>(`/accounts/${id}/`, { method: 'DELETE' });
}

export async function listBanks(): Promise<Bank[]> {
  return apiFetch<Bank[]>('/banks');
}
