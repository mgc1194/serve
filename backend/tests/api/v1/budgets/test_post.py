"""
tests/api/v1/budgets/test_post.py — Tests for POST /budgets/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget
from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestCreateBudget:
    def test_creates_a_period_budget(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'period',
                'household_id': household.id,
                'period_start': '2026-08-01',
                'period_end': '2026-08-31',
            },
            user=alice,
        )
        assert response.status_code == 200
        body = response.json()
        assert body['name'] == 'August 2026'
        assert body['type'] == 'period'
        assert body['period_start'] == '2026-08-01'
        assert body['period_end'] == '2026-08-31'
        assert body['is_active'] is True
        assert body['household_id'] == household.id

    def test_creates_a_project_budget_with_no_period(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'Iceland Trip',
                'type': 'project',
                'household_id': household.id,
            },
            user=alice,
        )
        assert response.status_code == 200
        body = response.json()
        assert body['type'] == 'project'
        assert body['period_start'] is None
        assert body['period_end'] is None

    def test_period_budget_without_period_start_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'period',
                'household_id': household.id,
                'period_end': '2026-08-31',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_period_budget_without_period_end_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'period',
                'household_id': household.id,
                'period_start': '2026-08-01',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_period_start_after_period_end_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'Backwards',
                'type': 'period',
                'household_id': household.id,
                'period_start': '2026-09-15',
                'period_end': '2026-08-15',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_project_budget_with_period_dates_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'Iceland Trip',
                'type': 'project',
                'household_id': household.id,
                'period_start': '2026-08-01',
                'period_end': '2026-08-31',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_duplicate_name_in_same_household_returns_400(self, client, alice, household):
        BudgetFactory(household=household, name='August 2026')
        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'project',
                'household_id': household.id,
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_same_name_in_different_household_is_allowed(
        self, client, alice, seth, household, other_household
    ):
        other_household.users.add(alice)
        BudgetFactory(household=other_household, name='August 2026')
        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'project',
                'household_id': household.id,
            },
            user=alice,
        )
        assert response.status_code == 200

    def test_blank_name_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={'name': '   ', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400

    def test_name_over_max_length_returns_400(self, client, alice, household):
        max_length = Budget._meta.get_field('name').max_length
        response = client.post(
            '/budgets/',
            json={'name': 'X' * (max_length + 1), 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400

    def test_returns_403_for_non_member_household(self, client, alice, other_household):
        response = client.post(
            '/budgets/',
            json={'name': 'Spy Budget', 'type': 'project', 'household_id': other_household.id},
            user=alice,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.post(
            '/budgets/',
            json={'name': 'Ghost Budget', 'type': 'project', 'household_id': 999999},
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.post(
            '/budgets/',
            json={'name': 'X', 'type': 'project', 'household_id': household.id},
        )
        assert response.status_code == 401
