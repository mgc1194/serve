"""
tests/api/v1/budgets/test_lines.py — Tests for GET/POST /budgets/{id}/lines
and DELETE /budget-lines/{id}/.

Root conftest provides: alice, seth, household, other_household, category, budget.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import BudgetLine
from tests.factories import BudgetLineFactory, CategoryFactory


@pytest.mark.django_db
class TestListBudgetLines:
    def test_returns_lines_for_the_budget(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.status_code == 200
        assert any(item['id'] == line.id for item in response.json())

    def test_denormalizes_category_name_and_type(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', type='spending', household=household)
        BudgetLineFactory(budget=budget, category=category)
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        line = response.json()[0]
        assert line['category_name'] == 'Groceries'
        assert line['category_type'] == 'spending'

    def test_returns_empty_list_when_no_lines(self, client, alice, budget):
        response = client.get(f'/budgets/{budget.id}/lines', user=alice)
        assert response.json() == []

    def test_returns_403_for_non_member(self, client, seth, budget):
        response = client.get(f'/budgets/{budget.id}/lines', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.get('/budgets/9999/lines', user=alice)
        assert response.status_code == 404


@pytest.mark.django_db
class TestCreateBudgetLine:
    def test_creates_line_with_default_amount(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': category.id}, user=alice
        )
        assert response.status_code == 200
        data = response.json()
        assert data['category_id'] == category.id
        assert data['planned_amount'] == '0.00'
        assert data['notes'] == ''

    def test_creates_line_with_explicit_amount_and_notes(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines',
            json={'category_id': category.id, 'planned_amount': '250.00', 'notes': 'Weekly shop'},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['planned_amount'] == '250.00'
        assert data['notes'] == 'Weekly shop'

    def test_duplicate_category_in_same_budget_returns_400(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        BudgetLineFactory(budget=budget, category=category)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': category.id}, user=alice
        )
        assert response.status_code == 400

    def test_category_from_other_household_returns_400(
        self, client, alice, budget, other_household
    ):
        other_category = CategoryFactory(name='Groceries', household=other_household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': other_category.id}, user=alice
        )
        assert response.status_code == 400

    def test_nonexistent_category_returns_404(self, client, alice, budget):
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': 9999}, user=alice
        )
        assert response.status_code == 404

    def test_returns_403_for_non_member(self, client, seth, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(
            f'/budgets/{budget.id}/lines', json={'category_id': category.id}, user=seth
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post('/budgets/9999/lines', json={'category_id': category.id}, user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        response = client.post(f'/budgets/{budget.id}/lines', json={'category_id': category.id})
        assert response.status_code == 401


@pytest.mark.django_db
class TestDeleteBudgetLine:
    def test_deletes_line(self, client, alice, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        lid = line.id
        response = client.delete(f'/budget-lines/{lid}/', user=alice)
        assert response.status_code == 204
        assert not BudgetLine.objects.filter(pk=lid).exists()

    def test_returns_403_for_non_member(self, client, seth, budget, household):
        category = CategoryFactory(name='Groceries', household=household)
        line = BudgetLineFactory(budget=budget, category=category)
        response = client.delete(f'/budget-lines/{line.id}/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_line(self, client, alice):
        response = client.delete('/budget-lines/9999/', user=alice)
        assert response.status_code == 404
