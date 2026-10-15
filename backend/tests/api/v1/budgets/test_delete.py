"""
tests/api/v1/budgets/test_delete.py — Tests for DELETE /budgets/{id}/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget
from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestDeactivateBudget:
    def test_deactivates_budget(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.delete(f'/budgets/{budget.id}/', user=alice)
        assert response.status_code == 204

        budget.refresh_from_db()
        assert budget.is_active is False

    def test_is_a_soft_delete_not_a_hard_delete(self, client, alice, household):
        """Unlike Account, the row is preserved — only is_active flips."""
        budget = BudgetFactory(household=household, name='January 2026')
        bid = budget.id
        client.delete(f'/budgets/{bid}/', user=alice)
        assert Budget.objects.filter(pk=bid).exists()

    def test_excluded_from_list_after_deactivating(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        client.delete(f'/budgets/{budget.id}/', user=alice)

        response = client.get(f'/budgets/?household_id={household.id}', user=alice)
        ids = [b['id'] for b in response.json()]
        assert budget.id not in ids

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.delete(f'/budgets/{budget.id}/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.delete('/budgets/9999/', user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.delete(f'/budgets/{budget.id}/')
        assert response.status_code == 401
