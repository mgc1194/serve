// tests/integration/households.integration.test.ts — Households service integration tests.
//
// Tests the full request/response cycle of the households service against MSW.
// No mocking of fetch or service internals — exercises the real service code
// with realistic API responses intercepted by MSW.

import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { ApiError } from '@services/api-client';
import {
  addMember,
  createHousehold,
  deleteHousehold,
  listHouseholds,
  renameHousehold,
} from '@services/households';

import { mockUser, server } from '../utils/msw';

const [mockHousehold] = mockUser.households;

describe('listHouseholds', () => {
  it('returns the list of households on success', async () => {
    const households = await listHouseholds();
    expect(households).toMatchObject(mockUser.households);
  });

  it('throws ApiError with status 401 when unauthenticated', async () => {
    server.use(
      http.get('/api/v1/households/', () => new HttpResponse(null, { status: 401 })),
    );

    await expect(listHouseholds()).rejects.toMatchObject({ status: 401 });
  });
});

describe('createHousehold', () => {
  it('returns the created household on success', async () => {
    const household = await createHousehold('New Household');
    expect(household).toMatchObject({ name: 'New Household' });
  });

  it('throws ApiError with status 400 on duplicate name', async () => {
    server.use(
      http.post('/api/v1/households/', () =>
        HttpResponse.json(
          { detail: 'You already have a household named "New Household".' },
          { status: 400 },
        ),
      ),
    );

    await expect(createHousehold('New Household')).rejects.toMatchObject({
      status: 400,
      message: 'You already have a household named "New Household".',
    });
  });
});

describe('renameHousehold', () => {
  it('returns the updated household on success', async () => {
    const household = await renameHousehold(mockHousehold.id, 'Renamed');
    expect(household).toMatchObject({ name: 'Renamed' });
  });

  it('throws ApiError with status 404 when household not found', async () => {
    server.use(
      http.patch('/api/v1/households/:id/', () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
    );

    await expect(renameHousehold(9999, 'Renamed')).rejects.toMatchObject({ status: 404 });
  });
});

describe('deleteHousehold', () => {
  it('resolves on 204', async () => {
    await expect(deleteHousehold(mockHousehold.id)).resolves.toBeUndefined();
  });

  it('throws ApiError with status 409 when accounts exist', async () => {
    server.use(
      http.delete('/api/v1/households/:id/', () =>
        HttpResponse.json(
          { detail: 'This household still has accounts.' },
          { status: 409 },
        ),
      ),
    );

    await expect(deleteHousehold(mockHousehold.id)).rejects.toMatchObject({
      status: 409,
      message: 'This household still has accounts.',
    });
  });
});

describe('addMember', () => {
  it('returns the updated household with the new member', async () => {
    const household = await addMember(mockHousehold.id, 'new@example.com');
    expect(household.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ email: 'new@example.com' })]),
    );
  });

  it('throws ApiError with status 400 when email not found', async () => {
    server.use(
      http.post('/api/v1/households/:id/members/', () =>
        HttpResponse.json(
          { detail: 'No account found with that email address.' },
          { status: 400 },
        ),
      ),
    );

    await expect(addMember(mockHousehold.id, 'unknown@example.com')).rejects.toMatchObject({
      status: 400,
      message: 'No account found with that email address.',
    });
  });

  it('throws ApiError with status 409 when member already exists', async () => {
    server.use(
      http.post('/api/v1/households/:id/members/', () =>
        HttpResponse.json(
          { detail: 'This user is already a member of the household.' },
          { status: 409 },
        ),
      ),
    );

    await expect(addMember(mockHousehold.id, mockUser.email)).rejects.toBeInstanceOf(ApiError);
  });
});
