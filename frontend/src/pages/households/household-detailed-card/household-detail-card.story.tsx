import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';

import { HouseholdDetailCard } from '@pages/households/household-detailed-card';
import { makeCategory, makeLabel } from '@serve/mocks';
import type { Category, Label } from '@serve/types/global';

// HouseholdDetailCard fetches its own labels/categories internally (see
// household-detailed-card/index.tsx) rather than taking them as props, so
// populating either one here means mocking the network call, not passing
// args. Every story below gets explicit handlers (even an empty list) for
// determinism — an unmocked request is bypassed (see .storybook/preview.tsx)
// and falls through to a real, backend-less fetch, which still ends up
// empty but less predictably so.
const API = '/api/v1';

function handlersFor(householdId: number, categories: Category[], labels: Label[]) {
  return [
    http.get(`${API}/categories/`, ({ request }) => {
      const url = new URL(request.url);
      if (Number(url.searchParams.get('household_id')) !== householdId) return HttpResponse.json([]);
      return HttpResponse.json(categories);
    }),
    http.get(`${API}/labels/`, ({ request }) => {
      const url = new URL(request.url);
      if (Number(url.searchParams.get('household_id')) !== householdId) return HttpResponse.json([]);
      return HttpResponse.json(labels);
    }),
  ];
}

const meta: Meta<typeof HouseholdDetailCard> = {
  title: 'Households/HouseholdDetailCard',
  component: HouseholdDetailCard,
  parameters: {
    layout: 'padded',
    router: true,
    msw: handlersFor(1, [], []),
  },
  args: {
    onUpdated: () => {},
    onDeleted: () => {},
    onAddAccount: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdDetailCard>;

const baseHousehold = {
  id: 1,
  name: 'Smith Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const WithMembers: Story = {
  args: {
    household: {
      ...baseHousehold,
      members: [
        { id: 1, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith' },
        { id: 2, email: 'seth@example.com', first_name: 'Seth', last_name: 'Smith' },
      ],
    },
    accountCount: 1,
  },
};

export const NoMembers: Story = {
  args: {
    household: {
      ...baseHousehold,
      members: [],
    },
    accountCount: null,
  },
};

export const WithCategoriesAndLabels: Story = {
  args: {
    household: {
      ...baseHousehold,
      members: [{ id: 1, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith' }],
    },
    accountCount: 2,
  },
  parameters: {
    msw: handlersFor(
      1,
      [
        makeCategory({ id: 1, name: 'Groceries', type: 'spending' }),
        makeCategory({ id: 2, name: 'Rent', type: 'spending' }),
        makeCategory({ id: 3, name: 'Salary', type: 'earning' }),
      ],
      [
        makeLabel({ id: 1, name: 'Trader Joes', color: '#16a34a', category_id: 1 }),
        makeLabel({ id: 2, name: 'Whole Foods', color: '#2563eb', category_id: 1 }),
      ],
    ),
  },
};
