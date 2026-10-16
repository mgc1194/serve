"""
tests/api/v1/budgets/test_delete.py — Tests for DELETE /budgets/{id}/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget, BudgetLine
from tests.factories import BudgetFactory, BudgetLineFactory


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


@pytest.mark.django_db
class TestRenameOnDeactivate:
    """Budget's (household, name) uniqueness can't be made conditional on
    is_active (MySQL has no partial/conditional unique index), so a
    deactivated budget would otherwise reserve its name forever. These
    cover the rename that frees it up instead — see Budget's model
    docstring and deactivate_budget's.
    """

    def test_renamed_with_a_disambiguating_suffix(self, client, alice, household):
        budget = BudgetFactory(household=household, name='August 2026')
        client.delete(f'/budgets/{budget.id}/', user=alice)

        budget.refresh_from_db()
        assert budget.name == f'August 2026 (deleted #{budget.id})'

    def test_truncates_a_near_max_length_name_so_the_suffix_fits(self, client, alice, household):
        max_length = Budget._meta.get_field('name').max_length
        budget = BudgetFactory(household=household, name='X' * max_length)
        client.delete(f'/budgets/{budget.id}/', user=alice)

        budget.refresh_from_db()
        assert len(budget.name) == max_length
        assert budget.name.endswith(f' (deleted #{budget.id})')

    def test_lines_are_preserved_under_the_renamed_budget(self, client, alice, household):
        budget = BudgetFactory(household=household, name='August 2026')
        line = BudgetLineFactory(budget=budget, planned_amount=500)
        client.delete(f'/budgets/{budget.id}/', user=alice)

        assert BudgetLine.objects.filter(pk=line.pk, budget_id=budget.id).exists()
        line.refresh_from_db()
        assert line.planned_amount == 500

    def test_frees_up_the_original_name(self, client, alice, household):
        budget = BudgetFactory(household=household, name='August 2026')
        client.delete(f'/budgets/{budget.id}/', user=alice)

        response = client.post(
            '/budgets/',
            json={'name': 'August 2026', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200

    def test_repeated_deactivation_does_not_rename_again(self, client, alice, household):
        budget = BudgetFactory(household=household, name='August 2026')
        client.delete(f'/budgets/{budget.id}/', user=alice)
        budget.refresh_from_db()
        renamed_name = budget.name

        response = client.delete(f'/budgets/{budget.id}/', user=alice)
        assert response.status_code == 204
        budget.refresh_from_db()
        assert budget.name == renamed_name
