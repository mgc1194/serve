"""
tests/api/v1/budgets/test_post.py — Tests for POST /budgets/.

Root conftest provides: alice, household, other_household, budget.
budgets/conftest.py provides: client.
"""

import pytest

from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestCreateBudget:
    def test_creates_spending_budget(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'February Budget',
                'type': 'spending',
                'household_id': household.id,
                'period_start': '2026-02-01',
                'period_end': '2026-02-28',
            },
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'February Budget'
        assert data['type'] == 'spending'
        assert data['period_start'] == '2026-02-01'
        assert data['period_end'] == '2026-02-28'
        assert data['is_active'] is True

    def test_creates_project_budget_with_no_period(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={'name': 'Iceland Trip', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['period_start'] is None
        assert data['period_end'] is None

    def test_project_budget_with_period_dates_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'Iceland Trip',
                'type': 'project',
                'household_id': household.id,
                'period_start': '2026-02-01',
                'period_end': '2026-02-28',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_spending_budget_missing_period_end_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'February Budget',
                'type': 'spending',
                'household_id': household.id,
                'period_start': '2026-02-01',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_spending_budget_missing_period_start_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'February Budget',
                'type': 'spending',
                'household_id': household.id,
                'period_end': '2026-02-28',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_period_start_after_period_end_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'February Budget',
                'type': 'spending',
                'household_id': household.id,
                'period_start': '2026-02-28',
                'period_end': '2026-02-01',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_same_name_different_type_does_not_collide(self, client, alice, household, budget):
        response = client.post(
            '/budgets/',
            json={
                'name': budget.name,
                'type': 'project',
                'household_id': household.id,
            },
            user=alice,
        )
        assert response.status_code == 200

    def test_duplicate_active_name_and_type_returns_400(self, client, alice, household, budget):
        response = client.post(
            '/budgets/',
            json={
                'name': budget.name,
                'type': budget.type,
                'household_id': household.id,
                'period_start': '2026-03-01',
                'period_end': '2026-03-31',
            },
            user=alice,
        )
        assert response.status_code == 400

    def test_reactivates_soft_deleted_budget(self, client, alice, household):
        inactive = BudgetFactory(
            name='Travel', type='spending', household=household, is_active=False
        )
        response = client.post(
            '/budgets/',
            json={
                'name': 'Travel',
                'type': 'spending',
                'household_id': household.id,
                'period_start': '2026-04-01',
                'period_end': '2026-04-30',
            },
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == inactive.id
        assert data['is_active'] is True
        assert data['period_start'] == '2026-04-01'
        inactive.refresh_from_db()
        assert inactive.is_active is True

    def test_blank_name_returns_400(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': '  ',
                'type': 'spending',
                'household_id': household.id,
                'period_start': '2026-02-01',
                'period_end': '2026-02-28',
            },
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
            json={'name': 'X', 'type': 'project', 'household_id': 9999},
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.post(
            '/budgets/',
            json={'name': 'X', 'type': 'project', 'household_id': household.id},
        )
        assert response.status_code == 401
