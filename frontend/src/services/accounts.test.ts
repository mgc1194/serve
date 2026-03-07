// services/accounts.test.ts — Unit tests for account service endpoints.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createAccount,
  deleteAccount,
  listAccounts,
  listBanks,
  renameAccount,
} from '@services/accounts';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const account = {
  id: 1,
  name: 'My Savings',
  handler_key: 'sofi-savings',
  account_type_id: 1,
  account_type: 'SoFi Savings',
  bank_id: 1,
  bank_name: 'SoFi',
  household_id: 1,
  household_name: 'Smith Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

afterEach(() => vi.restoreAllMocks());

describe('listAccounts', () => {
  it('returns list on 200', async () => {
    mockFetch(200, [account]);
    expect(await listAccounts()).toEqual([account]);
  });

  it('sends no query string when called with no params', async () => {
    const spy = mockFetch(200, []);
    await listAccounts();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/'),
      expect.any(Object),
    );
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).not.toContain('?');
  });

  it('sends household_id filter', async () => {
    const spy = mockFetch(200, []);
    await listAccounts({ household_id: 5 });
    expect((spy.mock.calls[0] as [string])[0]).toContain('household_id=5');
  });

  it('sends bank_id filter', async () => {
    const spy = mockFetch(200, []);
    await listAccounts({ bank_id: 3 });
    expect((spy.mock.calls[0] as [string])[0]).toContain('bank_id=3');
  });

  it('sends sort param', async () => {
    const spy = mockFetch(200, []);
    await listAccounts({ sort: 'name' });
    expect((spy.mock.calls[0] as [string])[0]).toContain('sort=name');
  });
});

describe('createAccount', () => {
  it('sends POST and returns created account', async () => {
    const spy = mockFetch(200, account);
    const result = await createAccount({ household_id: 1, account_type_id: 1, name: 'My Savings' });
    expect(result).toEqual(account);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError on 400', async () => {
    mockFetch(400, { detail: 'An account named "My Savings" already exists in this household.' });
    await expect(createAccount({ household_id: 1, account_type_id: 1, name: 'My Savings' }))
      .rejects.toMatchObject({ status: 400 });
  });
});

describe('renameAccount', () => {
  it('sends PATCH and returns updated account', async () => {
    const spy = mockFetch(200, { ...account, name: 'Renamed' });
    const result = await renameAccount(1, 'Renamed');
    expect(result.name).toBe('Renamed');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/1/'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('deleteAccount', () => {
  it('sends DELETE and returns undefined on 204', async () => {
    mockFetch(204);
    expect(await deleteAccount(1)).toBeUndefined();
  });

  it('throws ApiError with 409 when account has transactions', async () => {
    mockFetch(409, { detail: 'This account has transactions and cannot be deleted.' });
    await expect(deleteAccount(1)).rejects.toMatchObject({
      status: 409,
      message: 'This account has transactions and cannot be deleted.',
    });
  });
});

describe('listBanks', () => {
  it('returns banks list on 200', async () => {
    const banks = [{ id: 1, name: 'SoFi', account_types: [] }];
    mockFetch(200, banks);
    expect(await listBanks()).toEqual(banks);
  });
});
