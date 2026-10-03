"""
tests/api/v1/budgets/test_patch.py — Tests for PATCH /budgets/{id}/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget
from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestRenameBudget:
    def test_renames_budget(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'Renamed'}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'Renamed'

    def test_blank_name_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.patch(f'/budgets/{budget.id}/', json={'name': '   '}, user=alice)
        assert response.status_code == 400

    def test_name_over_max_length_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household, name='January 2026')
        max_length = Budget._meta.get_field('name').max_length
        response = client.patch(
            f'/budgets/{budget.id}/', json={'name': 'X' * (max_length + 1)}, user=alice
        )
        assert response.status_code == 400

    def test_duplicate_name_in_same_household_returns_400(self, client, alice, household):
        BudgetFactory(household=household, name='Other Budget')
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'Other Budget'}, user=alice)
        assert response.status_code == 400

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'X'}, user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.patch('/budgets/9999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        budget = BudgetFactory(household=household, name='January 2026')
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'X'})
        assert response.status_code == 401
