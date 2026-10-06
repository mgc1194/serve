"""
tests/api/v1/budgets/test_lines.py — Tests for GET/POST /budgets/{id}/lines,
PATCH/DELETE /budget-lines/{id}/, POST /budgets/{id}/recompute-actuals/,
and actual_amount staleness.

Root conftest provides: alice, seth, household, other_household, category,
label, account.
budgets/conftest.py provides: client.

No root `budget` fixture exists — each test creates its own budget inline
via BudgetFactory(household=household, ...), matching test_post.py/
test_get.py/test_patch.py/test_delete.py.
"""

import pytest

from budgets.models import BudgetLine
from tests.factories import (
    BudgetFactory,
    BudgetLineFactory,
    CategoryFactory,
    LabelFactory,
    TransactionFactory,
)


@pytest.mark.django_db
class TestListBudgetLines:
    def test_returns_lines_for_the_budget(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.status_code == 200
        assert any(item['id'] == line.id for item in response.json())

    def test_denormalizes_category_name_and_type(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        line = response.json()[0]
        assert line['category_name'] == 'Groceries'
        assert line['category_type'] == 'spending'

    def test_returns_empty_list_when_no_lines(self, client, alice, household):
        budget = BudgetFactory(household=household)
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.json() == []

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household)
        response = client.get(f'/budgets/{budget.id}/lines', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.get('/budgets/9999/lines', user=alice)
        assert response.status_code == 404


@pytest.mark.django_db
class TestCreateBudgetLine:
    def test_creates_line_with_zero_planned_amount(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines',
            json={'category_id': category.id, 'planned_amount': 0},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['category_id'] == category.id
        assert data['planned_amount'] == 0
        assert data['notes'] == ''

    def test_missing_planned_amount_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': category.id}, user=alice
        )
        assert response.status_code == 400
        assert response.json()['detail'] == 'planned_amount is required.'

    def test_creates_line_with_explicit_amount_and_notes(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines',
            json={'category_id': category.id, 'planned_amount': 250, 'notes': 'Weekly shop'},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['planned_amount'] == 250
        assert data['notes'] == 'Weekly shop'

    def test_duplicate_category_in_same_budget_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        BudgetLineFactory(budget=budget, category=category)
        response = client.post(
            f'/budgets/{budget.id}/lines',
            json={'category_id': category.id, 'planned_amount': 100},
            user=alice,
        )
        assert response.status_code == 400

    def test_category_from_other_household_returns_400(
        self, client, alice, household, other_household
    ):
        budget = BudgetFactory(household=household)
        other_category = CategoryFactory(name='Groceries', household=other_household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': other_category.id}, user=alice
        )
        assert response.status_code == 400

    def test_negative_planned_amount_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines',
            json={'category_id': category.id, 'planned_amount': -100},
            user=alice,
        )
        assert response.status_code == 400
        assert response.json()['detail'] == 'planned_amount must not be negative.'

    def test_nonexistent_category_returns_404(self, client, alice, household):
        budget = BudgetFactory(household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': 9999}, user=alice
        )
        assert response.status_code == 404

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': category.id}, user=seth
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post('/budgets/9999/lines', json={'category_id': category.id}, user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(f'/budgets/{budget.id}/lines', json={'category_id': category.id})
        assert response.status_code == 401


@pytest.mark.django_db
class TestUpdateBudgetLine:
    def test_updates_planned_amount(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.patch(
            f'/budget-lines/{line.id}/', json={'planned_amount': 500}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['planned_amount'] == 500

    def test_updates_notes(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.patch(
            f'/budget-lines/{line.id}/', json={'notes': 'Includes pet food'}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['notes'] == 'Includes pet food'

    def test_persists_to_database(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        client.patch(f'/budget-lines/{line.id}/', json={'planned_amount': 500}, user=alice)
        line.refresh_from_db()
        assert line.planned_amount == 500

    def test_response_includes_the_cached_actual_amount(self, client, alice, household, account):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Trader Joes', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-50, date='2026-01-10')
        client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)

        response = client.patch(
            f'/budget-lines/{line.id}/', json={'planned_amount': 100}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['actual_amount'] == '50.00'

    def test_does_not_recompute_actual_amount(self, client, alice, household, account):
        # planned_amount/notes are the only fields this endpoint touches —
        # actual_amount only ever changes via POST .../recompute-actuals/.
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Trader Joes', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-50, date='2026-01-10')

        response = client.patch(
            f'/budget-lines/{line.id}/', json={'planned_amount': 100}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['actual_amount'] == '0.00'
        assert response.json()['is_stale'] is True

    def test_no_fields_provided_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.patch(f'/budget-lines/{line.id}/', json={}, user=alice)
        assert response.status_code == 400

    def test_negative_planned_amount_returns_400(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.patch(
            f'/budget-lines/{line.id}/', json={'planned_amount': -10}, user=alice
        )
        assert response.status_code == 400

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.patch(f'/budget-lines/{line.id}/', json={'planned_amount': 10}, user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_line(self, client, alice):
        response = client.patch('/budget-lines/9999/', json={'planned_amount': 10}, user=alice)
        assert response.status_code == 404


@pytest.mark.django_db
class TestRecomputeBudgetActuals:
    """actual_amount is a cache: GET never computes it, only
    POST /budgets/{id}/recompute-actuals/ does. These tests call that
    endpoint and check both its response and what GET returns afterward,
    to confirm the result is actually persisted, not just returned once.
    """

    def test_sums_transactions_within_the_period(self, client, alice, household, account):
        budget = BudgetFactory(
            household=household, period_start='2026-01-01', period_end='2026-01-31'
        )
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Trader Joes', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-30, date='2026-01-05')
        TransactionFactory(account=account, label=label, amount=-20, date='2026-01-20')

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        assert response.status_code == 200
        assert response.json()[0]['actual_amount'] == '50.00'

        get_response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert get_response.json()[0]['actual_amount'] == '50.00'

    def test_excludes_transactions_outside_the_period(self, client, alice, household, account):
        budget = BudgetFactory(
            household=household, period_start='2026-01-01', period_end='2026-01-31'
        )
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Trader Joes', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-30, date='2026-02-01')

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        assert response.json()[0]['actual_amount'] == '0.00'

    def test_excludes_transactions_marked_exclude_from_summary(
        self, client, alice, household, account
    ):
        budget = BudgetFactory(
            household=household, period_start='2026-01-01', period_end='2026-01-31'
        )
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Trader Joes', category=category, household=household)
        TransactionFactory(
            account=account,
            label=label,
            amount=-30,
            date='2026-01-05',
            exclude_from_summary=True,
        )

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        assert response.json()[0]['actual_amount'] == '0.00'

    def test_project_budget_sums_regardless_of_date(self, client, alice, household, account):
        budget = BudgetFactory(
            name='Old Trip', type='project', period_start=None, period_end=None, household=household
        )
        category = CategoryFactory(name='Old category', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Old label', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-30, date='2020-01-01')

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        lines = {item['category_id']: item for item in response.json()}
        assert lines[category.id]['actual_amount'] == '30.00'

    def test_actual_amount_is_a_positive_magnitude_for_income_categories(
        self, client, alice, household, account
    ):
        budget = BudgetFactory(
            household=household, period_start='2026-01-01', period_end='2026-01-31'
        )
        category = CategoryFactory(name='Paycheck', type='earning', household=household)
        BudgetLineFactory(budget=budget, category=category)
        label = LabelFactory(name='Paycheck', category=category, household=household)
        TransactionFactory(account=account, label=label, amount=1000, date='2026-01-15')

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        assert response.json()[0]['actual_amount'] == '1000.00'

    def test_zero_when_no_matching_transactions(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        BudgetLineFactory(budget=budget, category=category)
        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        assert response.json()[0]['actual_amount'] == '0.00'

    def test_recomputes_every_line_in_the_budget(self, client, alice, household, account):
        budget = BudgetFactory(household=household)
        groceries = CategoryFactory(name='Groceries', type='spending', household=household)
        paycheck = CategoryFactory(name='Paycheck', type='earning', household=household)
        BudgetLineFactory(budget=budget, category=groceries)
        BudgetLineFactory(budget=budget, category=paycheck)
        groceries_label = LabelFactory(name='Trader Joes', category=groceries, household=household)
        paycheck_label = LabelFactory(name='Paycheck', category=paycheck, household=household)
        TransactionFactory(account=account, label=groceries_label, amount=-40, date='2026-01-05')
        TransactionFactory(account=account, label=paycheck_label, amount=2000, date='2026-01-01')

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        amounts = {item['category_id']: item['actual_amount'] for item in response.json()}
        assert amounts[groceries.id] == '40.00'
        assert amounts[paycheck.id] == '2000.00'

    def test_sets_computed_at_and_clears_is_stale(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(household=household)
        BudgetLineFactory(budget=budget, category=category)

        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)
        line = response.json()[0]
        assert line['actual_amount_computed_at'] is not None
        assert line['is_stale'] is False

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household)
        response = client.post(f'/budgets/{budget.id}/recompute-actuals/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.post('/budgets/9999/recompute-actuals/', user=alice)
        assert response.status_code == 404


@pytest.mark.django_db
class TestActualAmountStaleness:
    def test_a_never_computed_line_is_stale(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(household=household)
        BudgetLineFactory(budget=budget, category=category)

        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.json()[0]['is_stale'] is True

    def test_not_stale_immediately_after_recompute(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(household=household)
        BudgetLineFactory(budget=budget, category=category)
        client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)

        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.json()[0]['is_stale'] is False

    def test_stale_again_after_a_new_matching_transaction(self, client, alice, household, account):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)

        label = LabelFactory(category=category, household=household)
        TransactionFactory(account=account, label=label, amount=-10, date='2026-01-05')

        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        line = response.json()[0]
        assert line['is_stale'] is True
        # Still the old cached figure — GET never recomputes.
        assert line['actual_amount'] == '0.00'

    def test_unrelated_category_transaction_does_not_cause_staleness(
        self, client, alice, household, account
    ):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        client.post(f'/budgets/{budget.id}/recompute-actuals/', user=alice)

        other_category = CategoryFactory(type='spending', household=household)
        other_label = LabelFactory(category=other_category, household=household)
        TransactionFactory(account=account, label=other_label, amount=-10, date='2026-01-05')

        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.json()[0]['is_stale'] is False


@pytest.mark.django_db
class TestDeleteBudgetLine:
    def test_deletes_line(self, client, alice, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        lid = line.id
        response = client.delete(f'/budget-lines/{lid}/', user=alice)
        assert response.status_code == 204
        assert not BudgetLine.objects.filter(pk=lid).exists()

    def test_returns_403_for_non_member(self, client, seth, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.delete(f'/budget-lines/{line.id}/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_line(self, client, alice):
        response = client.delete('/budget-lines/9999/', user=alice)
        assert response.status_code == 404
