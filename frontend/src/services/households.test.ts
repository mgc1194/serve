// services/households.test.ts — Unit tests for household service endpoints.
//
// apiFetch, CSRF, and ApiError behaviour is covered in api-client.test.ts.
// These tests focus on the correct HTTP method, URL, and error propagation
// for each household endpoint.
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addMember,
  createHousehold,
  deleteHousehold,
  listHouseholds,
  renameHousehold,
} from '@services/households';

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
    await expect(listHouseholds()).rejects.toMatchObject({ status: 401 });
  });
});

describe('createHousehold', () => {
  it('sends POST with name and returns created household', async () => {
    const spy = mockFetch(200, { ...household, name: 'New household' });
    const result = await createHousehold('New household');
    expect(result.name).toBe('New household');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('/households/'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws ApiError with server message on 400', async () => {
    mockFetch(400, { detail: 'You already have a household named "New household".' });
    await expect(createHousehold('New household')).rejects.toMatchObject({
      message: 'You already have a household named "New household".',
    });
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
  it('sends DELETE and returns undefined on 204', async () => {
    mockFetch(204);
    expect(await deleteHousehold(1)).toBeUndefined();
  });

  it('throws ApiError with 409 message when accounts exist', async () => {
    mockFetch(409, { detail: 'This household still has accounts.' });
    await expect(deleteHousehold(1)).rejects.toMatchObject({
      message: 'This household still has accounts.',
    });
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
    await expect(addMember(1, 'unknown@example.com')).rejects.toMatchObject({
      message: 'No account found with that email address.',
    });
  });
});
