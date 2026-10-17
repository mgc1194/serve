"""
tests/budgets/test_migrations.py — Tests for budgets' data migrations.

0005_backfill_deactivated_budget_names.backfill_deactivated_budget_names
is called directly (via importlib, since the module name starts with a
digit) rather than through a full migration-testing framework — there's
no existing convention for that in this codebase, and the function only
touches Budget's id/name/is_active, which are unchanged between migration
0004 and HEAD, so the real (non-historical) model is equivalent to the
one apps.get_model would hand it at that point in migration history.
"""

import importlib

import pytest
from django.apps import apps as real_apps

from tests.factories import BudgetFactory

backfill_module = importlib.import_module(
    'budgets.migrations.0005_backfill_deactivated_budget_names'
)
backfill_deactivated_budget_names = backfill_module.backfill_deactivated_budget_names


def run_backfill():
    backfill_deactivated_budget_names(real_apps, None)


@pytest.mark.django_db
class TestBackfillDeactivatedBudgetNames:
    def test_renames_a_legacy_deactivated_budget(self, household):
        budget = BudgetFactory(household=household, name='August 2026', is_active=False)
        run_backfill()

        budget.refresh_from_db()
        assert budget.name == f'August 2026 (deleted #{budget.id})'
        assert budget.is_active is False

    def test_frees_up_the_name_for_reuse(self, household):
        BudgetFactory(household=household, name='August 2026', is_active=False)
        run_backfill()

        # Would raise IntegrityError (household, name) before the backfill
        # renamed the deactivated row out of the way.
        BudgetFactory(household=household, name='August 2026', is_active=True)

    def test_does_not_touch_active_budgets(self, household):
        budget = BudgetFactory(household=household, name='August 2026', is_active=True)
        run_backfill()

        budget.refresh_from_db()
        assert budget.name == 'August 2026'

    def test_truncates_a_near_max_length_name_so_the_suffix_fits(self, household):
        budget = BudgetFactory(household=household, name='X' * 100, is_active=False)
        run_backfill()

        budget.refresh_from_db()
        assert len(budget.name) == 100
        assert budget.name.endswith(f' (deleted #{budget.id})')

    def test_is_idempotent(self, household):
        budget = BudgetFactory(household=household, name='August 2026', is_active=False)
        run_backfill()
        budget.refresh_from_db()
        first_pass_name = budget.name

        run_backfill()
        budget.refresh_from_db()
        assert budget.name == first_pass_name

    def test_falls_back_to_a_disambiguated_name_when_the_first_candidate_collides(self, household):
        budget = BudgetFactory(household=household, name='August 2026', is_active=False)
        BudgetFactory(
            household=household,
            name=f'August 2026 (deleted #{budget.id})',
            is_active=True,
        )
        run_backfill()

        budget.refresh_from_db()
        assert budget.name != f'August 2026 (deleted #{budget.id})'
        assert budget.name.startswith(f'August 2026 (deleted #{budget.id}-')
