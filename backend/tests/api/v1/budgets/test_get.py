"""
tests/api/v1/budgets/test_get.py — Tests for GET /budgets/.

Root conftest provides: alice, household, other_household, budget.
budgets/conftest.py provides: client.
"""

import pytest

from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestListBudgets:
    def test_returns_budgets_for_users_households(self, client, alice, budget):
        response = client.get('/budgets/', user=alice)
        assert response.status_code == 200
        assert any(b['id'] == budget.id for b in response.json())

    def test_does_not_return_budgets_from_other_households(self, client, alice, other_household):
        BudgetFactory(name='Spy Budget', household=other_household)
        response = client.get('/budgets/', user=alice)
        assert response.json() == []

    def test_filters_by_household_id(self, client, alice, household, budget):
        response = client.get(f'/budgets/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert all(b['household_id'] == household.id for b in response.json())

    def test_returns_403_if_household_belongs_to_other_user(self, client, alice, other_household):
        response = client.get(f'/budgets/?household_id={other_household.id}', user=alice)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/budgets/?household_id=9999', user=alice)
        assert response.status_code == 404

    def test_returns_empty_list_when_no_budgets(self, client, alice, household):
        response = client.get('/budgets/', user=alice)
        assert response.json() == []

    def test_excludes_inactive_budgets_by_default(self, client, alice, household):
        inactive = BudgetFactory(name='Old', household=household, is_active=False)
        response = client.get('/budgets/', user=alice)
        assert all(b['id'] != inactive.id for b in response.json())

    def test_include_inactive_returns_soft_deleted_budgets(self, client, alice, household):
        inactive = BudgetFactory(name='Old', household=household, is_active=False)
        response = client.get('/budgets/?include_inactive=true', user=alice)
        assert any(b['id'] == inactive.id for b in response.json())

    def test_project_budget_has_null_period_dates(self, client, alice, household):
        BudgetFactory(
            name='Iceland Trip',
            type='project',
            period_start=None,
            period_end=None,
            household=household,
        )
        response = client.get('/budgets/', user=alice)
        project = next(b for b in response.json() if b['name'] == 'Iceland Trip')
        assert project['period_start'] is None
        assert project['period_end'] is None

    def test_unauthenticated_returns_401(self, client):
        response = client.get('/budgets/')
        assert response.status_code == 401
