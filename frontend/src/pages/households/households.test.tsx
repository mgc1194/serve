import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  listHouseholds,
  createHousehold,
  renameHousehold,
  deleteHousehold,
  addMember,
  ApiError,
} from '@serve/services/households';

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const household = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [],
};

afterEach(() => vi.restoreAllMocks());

describe('listHouseholds', () => {
  it('returns list on 200', async () => {
    mockFetch(200, [household]);
    expect(await listHouseholds()).toEqual([household]);
  });
  it('throws ApiError on 401', async () => {
    mockFetch(401, { detail: 'Unauthorized' });
    await expect(listHouseholds()).rejects.toThrow(ApiError);
  });
});

describe('createHousehold', () => {
  it('sends POST and returns created household', async () => {
    const spy = mockFetch(200, { ...household, name: 'New Household' });
    const result = await createHousehold('New Household');
    expect(result.name).toBe('New Household');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/households/'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it('throws ApiError with server message on 400', async () => {
    mockFetch(400, { detail: 'You already have a household named "New Household".' });
    await expect(createHousehold('New Household')).rejects.toThrow(
      'You already have a household named "New Household".',
    );
  });
});

describe('renameHousehold', () => {
  it('sends PATCH and returns updated household', async () => {
    const spy = mockFetch(200, { ...household, name: 'Renamed' });
    const result = await renameHousehold(1, 'Renamed');
    expect(result.name).toBe('Renamed');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/households/1/'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('deleteHousehold', () => {
  it('returns undefined on 204', async () => {
    mockFetch(204);
    expect(await deleteHousehold(1)).toBeUndefined();
  });
  it('throws ApiError when accounts exist', async () => {
    mockFetch(409, { detail: 'This household still has accounts.' });
    await expect(deleteHousehold(1)).rejects.toThrow('This household still has accounts.');
  });
});

describe('addMember', () => {
  it('sends POST to members endpoint', async () => {
    const spy = mockFetch(200, {
      ...household,
      members: [{ id: 2, email: 'new@example.com', first_name: 'New', last_name: 'User' }],
    });
    await addMember(1, 'new@example.com');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/households/1/members/'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it('throws ApiError when email not found', async () => {
    mockFetch(400, { detail: 'No account found with that email address.' });
    await expect(addMember(1, 'unknown@example.com')).rejects.toThrow(
      'No account found with that email address.',
    );
  });
});
