"""
tests/api/v1/budgets/test_post.py — Tests for POST /budgets/.

Root conftest provides: alice, seth, household, other_household.
budgets/conftest.py provides: client.
"""

import pytest

from budgets.models import Budget, BudgetLine
from tests.factories import BudgetFactory, BudgetLineFactory, CategoryFactory


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


@pytest.mark.django_db
class TestRecreateDeactivatedBudget:
    def test_reuses_the_name_of_a_deactivated_budget(self, client, alice, household):
        old = BudgetFactory(
            household=household,
            name='August 2026',
            is_active=False,
            type='period',
            period_start='2026-08-01',
            period_end='2026-08-31',
            synced_at='2026-08-15T00:00:00Z',
        )
        response = client.post(
            '/budgets/',
            json={'name': 'August 2026', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        body = response.json()
        # Reuses the same row rather than freeing up the name for a brand
        # new one — the (household, name) tuple never frees up on
        # deactivation, same as Category.
        assert body['id'] == old.id
        assert body['is_active'] is True
        assert body['type'] == 'project'
        assert body['period_start'] is None
        assert body['period_end'] is None
        # The old budget's stale sync is meaningless for what is really a
        # brand new budget.
        assert body['synced_at'] is None
        old.refresh_from_db()
        assert old.synced_at is None

    def test_reactivating_clears_lines_from_the_deactivated_budget(self, client, alice, household):
        old = BudgetFactory(household=household, name='August 2026', is_active=False)
        BudgetLineFactory(budget=old)
        response = client.post(
            '/budgets/',
            json={'name': 'August 2026', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        assert not BudgetLine.objects.filter(budget_id=old.id).exists()

    def test_reactivating_with_copy_lines_only_copies_the_source_budgets_lines(
        self, client, alice, household
    ):
        old = BudgetFactory(household=household, name='August 2026', is_active=False)
        BudgetLineFactory(budget=old)
        source = BudgetFactory(household=household)
        BudgetLineFactory(budget=source, planned_amount=750)

        response = client.post(
            '/budgets/',
            json={
                'name': 'August 2026',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 200
        copied = BudgetLine.objects.filter(budget_id=old.id)
        assert copied.count() == 1
        assert copied.first().planned_amount == 750

    def test_name_of_an_active_budget_is_still_blocked(self, client, alice, household):
        BudgetFactory(household=household, name='August 2026', is_active=True)
        response = client.post(
            '/budgets/',
            json={'name': 'August 2026', 'type': 'project', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestCopyLinesFromBudget:
    def test_copies_category_planned_amount_and_notes(self, client, alice, household):
        source = BudgetFactory(household=household, name='August 2026')
        earning = CategoryFactory(household=household, type='earning', name='Salary')
        spending = CategoryFactory(household=household, type='spending', name='Rent')
        BudgetLineFactory(budget=source, category=earning, planned_amount=5000, notes='biweekly')
        BudgetLineFactory(budget=source, category=spending, planned_amount=1500, notes='')

        response = client.post(
            '/budgets/',
            json={
                'name': 'September 2026',
                'type': 'period',
                'household_id': household.id,
                'period_start': '2026-09-01',
                'period_end': '2026-09-30',
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 200
        new_budget_id = response.json()['id']

        copied = list(BudgetLine.objects.filter(budget_id=new_budget_id).order_by('category__name'))
        assert len(copied) == 2
        assert [(line.category_id, line.planned_amount, line.notes) for line in copied] == [
            (spending.id, 1500, ''),
            (earning.id, 5000, 'biweekly'),
        ]

    def test_copied_lines_start_with_zero_actual_amount(self, client, alice, household):
        source = BudgetFactory(household=household)
        line = BudgetLineFactory(budget=source, planned_amount=200)
        line.actual_amount = 199
        line.save(update_fields=['actual_amount'])

        response = client.post(
            '/budgets/',
            json={
                'name': 'Copy',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 200
        copied = BudgetLine.objects.get(budget_id=response.json()['id'])
        assert copied.actual_amount == 0

    def test_source_with_no_lines_creates_an_empty_budget(self, client, alice, household):
        source = BudgetFactory(household=household)
        response = client.post(
            '/budgets/',
            json={
                'name': 'Copy',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 200
        assert not BudgetLine.objects.filter(budget_id=response.json()['id']).exists()

    def test_source_budget_in_different_household_returns_400(
        self, client, alice, household, other_household
    ):
        # alice must belong to BOTH households here — otherwise the 403
        # membership check on the source budget would fire first, and this
        # wouldn't be testing the household-mismatch check at all.
        other_household.users.add(alice)
        source = BudgetFactory(household=other_household)
        response = client.post(
            '/budgets/',
            json={
                'name': 'Copy',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 400
        assert not Budget.objects.filter(name='Copy').exists()

    def test_source_budget_user_is_not_a_member_of_returns_403(
        self, client, alice, household, other_household
    ):
        source = BudgetFactory(household=other_household)
        response = client.post(
            '/budgets/',
            json={
                'name': 'Copy',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 403

    def test_nonexistent_source_budget_returns_404(self, client, alice, household):
        response = client.post(
            '/budgets/',
            json={
                'name': 'Copy',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': 999999,
            },
            user=alice,
        )
        assert response.status_code == 404

    def test_failed_create_does_not_copy_lines(self, client, alice, household):
        BudgetFactory(household=household, name='September 2026')
        source = BudgetFactory(household=household)
        BudgetLineFactory(budget=source)

        response = client.post(
            '/budgets/',
            json={
                'name': 'September 2026',
                'type': 'project',
                'household_id': household.id,
                'copy_lines_from_budget_id': source.id,
            },
            user=alice,
        )
        assert response.status_code == 400
        # Only the original source line exists — nothing copied onto a
        # budget that was never actually created.
        assert BudgetLine.objects.count() == 1
