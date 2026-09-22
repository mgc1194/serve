"""
tests/api/v1/budgets/test_delete.py — Tests for DELETE /budgets/{id}/.

Root conftest provides: alice, seth, household, budget.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget, BudgetLine
from tests.factories import BudgetLineFactory, CategoryFactory


@pytest.mark.django_db
class TestDeleteBudget:
    def test_soft_deletes_budget(self, client, alice, budget):
        bid = budget.id
        response = client.delete(f'/budgets/{bid}/', user=alice)
        assert response.status_code == 204
        budget.refresh_from_db()
        assert budget.is_active is False
        # Never hard-deleted — the row must still exist.
        assert Budget.objects.filter(pk=bid).exists()

    def test_lines_survive_a_soft_delete(self, client, alice, household, budget):
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        client.delete(f'/budgets/{budget.id}/', user=alice)
        assert BudgetLine.objects.filter(pk=line.id).exists()

    def test_returns_403_for_non_member(self, client, seth, budget):
        response = client.delete(f'/budgets/{budget.id}/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.delete('/budgets/9999/', user=alice)
        assert response.status_code == 404
