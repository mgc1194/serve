"""
tests/api/v1/budgets/test_patch.py — Tests for PATCH /budgets/{id}/.

Root conftest provides: alice, seth, household, budget.
budgets/conftest.py provides: client.
"""

import pytest

from tests.factories import BudgetFactory


@pytest.mark.django_db
class TestUpdateBudget:
    def test_updates_name(self, client, alice, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'Renamed'}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'Renamed'

    def test_updates_period_dates(self, client, alice, budget):
        response = client.patch(
            f'/budgets/{budget.id}/',
            json={'period_start': '2026-02-01', 'period_end': '2026-02-28'},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['period_start'] == '2026-02-01'
        assert data['period_end'] == '2026-02-28'

    def test_updating_period_start_after_existing_period_end_returns_400(
        self, client, alice, budget
    ):
        # budget's existing period_end is 2026-01-31 (fixture default).
        response = client.patch(
            f'/budgets/{budget.id}/', json={'period_start': '2026-02-15'}, user=alice
        )
        assert response.status_code == 400

    def test_deactivates_via_is_active(self, client, alice, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={'is_active': False}, user=alice)
        assert response.status_code == 200
        assert response.json()['is_active'] is False

    def test_reactivates_via_is_active(self, client, alice, household):
        inactive = BudgetFactory(name='Old', household=household, is_active=False)
        response = client.patch(f'/budgets/{inactive.id}/', json={'is_active': True}, user=alice)
        assert response.status_code == 200
        assert response.json()['is_active'] is True

    def test_type_cannot_be_changed(self, client, alice, budget):
        # The schema has no `type` field at all — an extra field in the body
        # is simply ignored, not rejected, matching ninja's default behavior.
        response = client.patch(
            f'/budgets/{budget.id}/', json={'name': budget.name, 'type': 'project'}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['type'] == budget.type

    def test_unspecified_fields_are_unchanged(self, client, alice, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={'is_active': False}, user=alice)
        data = response.json()
        assert data['name'] == budget.name
        assert data['period_start'] == str(budget.period_start)

    def test_persists_to_database(self, client, alice, budget):
        client.patch(f'/budgets/{budget.id}/', json={'name': 'Renamed'}, user=alice)
        budget.refresh_from_db()
        assert budget.name == 'Renamed'

    def test_no_fields_provided_returns_400(self, client, alice, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={}, user=alice)
        assert response.status_code == 400
        assert 'at least one field' in response.json()['detail'].lower()

    def test_blank_name_returns_400(self, client, alice, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={'name': '   '}, user=alice)
        assert response.status_code == 400

    def test_duplicate_name_and_type_returns_400(self, client, alice, household, budget):
        other = BudgetFactory(name='Other Budget', type=budget.type, household=household)
        response = client.patch(f'/budgets/{budget.id}/', json={'name': other.name}, user=alice)
        assert response.status_code == 400

    def test_returns_403_for_non_member(self, client, seth, budget):
        response = client.patch(f'/budgets/{budget.id}/', json={'name': 'X'}, user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_budget(self, client, alice):
        response = client.patch('/budgets/9999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404
