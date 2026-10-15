"""
tests/api/v1/budgets/test_get.py — Tests for GET /budgets/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestListBudgets:
    def test_returns_budgets_for_the_household(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.get(f'/budgets/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        ids = [b['id'] for b in response.json()]
        assert budget.id in ids

    def test_does_not_return_budgets_from_other_households(
        self, client, alice, household, other_household
    ):
        BudgetFactory(household=household, name='January 2026')
        other = BudgetFactory(household=other_household, name='Spy Budget')
        response = client.get(f'/budgets/?household_id={household.id}', user=alice)
        ids = [b['id'] for b in response.json()]
        assert other.id not in ids

    def test_does_not_return_inactive_budgets(self, client, alice, household):
        BudgetFactory(household=household, name='Old Budget', is_active=False)
        response = client.get(f'/budgets/?household_id={household.id}', user=alice)
        names = [b['name'] for b in response.json()]
        assert 'Old Budget' not in names

    def test_returns_403_for_non_member_household(self, client, alice, other_household):
        response = client.get(f'/budgets/?household_id={other_household.id}', user=alice)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/budgets/?household_id=9999', user=alice)
        assert response.status_code == 404

    def test_missing_household_id_returns_422(self, client, alice):
        response = client.get('/budgets/', user=alice)
        assert response.status_code == 422

    def test_unauthenticated_returns_401(self, client, household):
        response = client.get(f'/budgets/?household_id={household.id}')
        assert response.status_code == 401
