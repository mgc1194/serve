"""
tests/budgets/test_models.py — Category and Budget model tests.
"""

import pytest
from django.db import IntegrityError
from django.db import transaction as db_transaction

from budgets.models import Budget, BudgetLine, Category
from tests.factories import BudgetFactory, BudgetLineFactory, CategoryFactory

pytestmark = pytest.mark.django_db


class TestCategoryCreation:
    def test_creates_with_defaults(self, household):
        category = CategoryFactory(household=household, name='Groceries')
        assert category.id is not None
        assert category.type == Category.Type.SPENDING
        assert category.is_active is True
        assert category.household == household

    def test_creates_earning_category(self, household):
        category = CategoryFactory(household=household, name='Salary', type=Category.Type.EARNING)
        assert category.type == Category.Type.EARNING


class TestCategoryStr:
    def test_str_spending(self, household):
        category = CategoryFactory(
            household=household, name='Groceries', type=Category.Type.SPENDING
        )
        assert str(category) == 'Groceries (Spending)'

    def test_str_earning(self, household):
        category = CategoryFactory(household=household, name='Salary', type=Category.Type.EARNING)
        assert str(category) == 'Salary (Earning)'


class TestCategoryUniqueConstraint:
    def test_duplicate_household_name_type_raises(self, household):
        CategoryFactory(household=household, name='Groceries', type=Category.Type.SPENDING)
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                CategoryFactory(household=household, name='Groceries', type=Category.Type.SPENDING)

    def test_same_name_different_type_allowed(self, household):
        """A household can have an 'Other' earning category and an 'Other'
        spending category at once — type is part of the category's identity,
        not a free-floating attribute of a name."""
        earning = CategoryFactory(household=household, name='Other', type=Category.Type.EARNING)
        spending = CategoryFactory(household=household, name='Other', type=Category.Type.SPENDING)
        assert earning.id != spending.id
        assert Category.objects.filter(household=household, name='Other').count() == 2

    def test_same_name_type_different_household_allowed(self, household, other_household):
        """The uniqueness constraint is scoped per household — two different
        households can each have their own 'Groceries' (spending) category."""
        CategoryFactory(household=household, name='Groceries', type=Category.Type.SPENDING)
        other = CategoryFactory(
            household=other_household, name='Groceries', type=Category.Type.SPENDING
        )
        assert other.id is not None

    def test_reactivating_soft_deleted_category_reuses_same_row(self, household):
        """Soft-delete never frees the (household, name, type) tuple — the API
        layer is expected to reactivate the existing row rather than create a
        new one. This test exercises that the row truly persists post-delete
        and can be flipped back on, sharing the same primary key."""
        category = CategoryFactory(
            household=household, name='Subscriptions', type=Category.Type.SPENDING
        )
        original_id = category.id

        category.is_active = False
        category.save()

        existing = Category.objects.filter(
            household=household, name='Subscriptions', type=Category.Type.SPENDING
        ).first()
        assert existing is not None
        assert existing.is_active is False

        existing.is_active = True
        existing.save()
        existing.refresh_from_db()

        assert existing.id == original_id
        assert (
            Category.objects.filter(
                household=household, name='Subscriptions', type=Category.Type.SPENDING
            ).count()
            == 1
        )


class TestCategoryCascadeDelete:
    def test_deleting_household_deletes_its_categories(self, household):
        CategoryFactory(household=household, name='Groceries')
        CategoryFactory(household=household, name='Salary', type=Category.Type.EARNING)
        household_id = household.id

        household.delete()

        assert Category.objects.filter(household_id=household_id).count() == 0

    def test_deleting_household_does_not_delete_other_households_categories(
        self, household, other_household
    ):
        CategoryFactory(household=household, name='Groceries')
        other_category = CategoryFactory(household=other_household, name='Rent')

        household.delete()

        assert Category.objects.filter(id=other_category.id).exists()


class TestBudgetCreation:
    def test_creates_with_defaults(self, household):
        budget = BudgetFactory(household=household, name='January 2026')
        assert budget.id is not None
        assert budget.type == Budget.Type.PERIOD
        assert budget.is_active is True
        assert budget.household == household

    def test_creates_a_project_budget_with_no_period(self, household):
        budget = BudgetFactory(
            household=household,
            name='Iceland Trip',
            type=Budget.Type.PROJECT,
            period_start=None,
            period_end=None,
        )
        assert budget.type == Budget.Type.PROJECT
        assert budget.period_start is None
        assert budget.period_end is None


class TestBudgetStr:
    def test_str_is_the_name(self, household):
        budget = BudgetFactory(household=household, name='January 2026')
        assert str(budget) == 'January 2026'


class TestBudgetUniqueConstraint:
    def test_duplicate_household_name_raises(self, household):
        BudgetFactory(household=household, name='January 2026')
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(household=household, name='January 2026')

    def test_same_name_different_type_still_collides(self, household):
        """Unlike Category, a budget's type isn't part of its name identity
        — a period budget and a project budget can't share a name."""
        BudgetFactory(household=household, name='January 2026', type=Budget.Type.PERIOD)
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    name='January 2026',
                    type=Budget.Type.PROJECT,
                    period_start=None,
                    period_end=None,
                )

    def test_same_name_different_household_allowed(self, household, other_household):
        BudgetFactory(household=household, name='January 2026')
        other = BudgetFactory(household=other_household, name='January 2026')
        assert other.id is not None


class TestBudgetPeriodTypeConstraint:
    """The period/type shape is enforced by a database CheckConstraint, not
    just the POST endpoint's validation — these tests write through the ORM
    directly (bypassing api/v1/budgets.py entirely) to prove the invariant
    holds regardless of how a row is written."""

    def test_period_budget_missing_period_start_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    type=Budget.Type.PERIOD,
                    period_start=None,
                    period_end='2026-01-31',
                )

    def test_period_budget_missing_period_end_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    type=Budget.Type.PERIOD,
                    period_start='2026-01-01',
                    period_end=None,
                )

    def test_period_budget_reversed_range_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    type=Budget.Type.PERIOD,
                    period_start='2026-01-31',
                    period_end='2026-01-01',
                )

    def test_project_budget_with_period_start_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    type=Budget.Type.PROJECT,
                    period_start='2026-01-01',
                    period_end=None,
                )

    def test_project_budget_with_period_end_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetFactory(
                    household=household,
                    type=Budget.Type.PROJECT,
                    period_start=None,
                    period_end='2026-01-31',
                )

    def test_period_budget_with_equal_start_and_end_is_allowed(self, household):
        """A same-day period is a valid (if unusual) range — the constraint
        rejects only a reversed one, via period_start__lte."""
        budget = BudgetFactory(
            household=household,
            type=Budget.Type.PERIOD,
            period_start='2026-01-01',
            period_end='2026-01-01',
        )
        assert budget.id is not None


class TestBudgetCascadeDelete:
    def test_deleting_household_deletes_its_budgets(self, household):
        BudgetFactory(household=household, name='January 2026')
        household_id = household.id

        household.delete()

        assert Budget.objects.filter(household_id=household_id).count() == 0

    def test_deleting_household_does_not_delete_other_households_budgets(
        self, household, other_household
    ):
        BudgetFactory(household=household, name='January 2026')
        other_budget = BudgetFactory(household=other_household, name='February 2026')

        household.delete()

        assert Budget.objects.filter(id=other_budget.id).exists()


class TestBudgetLinePlannedAmountConstraint:
    """planned_amount's non-negativity is enforced by a database
    CheckConstraint, not just api/v1/budgets.py's 400 checks on create/
    update — these tests write through the ORM directly (bypassing the API
    entirely) to prove the invariant holds regardless of how a row is
    written."""

    def test_negative_planned_amount_raises(self, household):
        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetLineFactory(budget=BudgetFactory(household=household), planned_amount=-1)

    def test_zero_planned_amount_is_allowed(self, household):
        line = BudgetLineFactory(budget=BudgetFactory(household=household), planned_amount=0)
        assert line.id is not None


class TestBudgetLineUniqueConstraint:
    """One line per (budget, category) is enforced by a database
    unique_together, not just the API layer's duplicate-line rejection —
    see BudgetLine's docstring."""

    def test_duplicate_budget_category_raises(self, household):
        budget = BudgetFactory(household=household)
        category = CategoryFactory(household=household)
        BudgetLineFactory(budget=budget, category=category)

        with pytest.raises(IntegrityError):
            with db_transaction.atomic():
                BudgetLineFactory(budget=budget, category=category)

        assert BudgetLine.objects.filter(budget=budget, category=category).count() == 1

    def test_same_category_different_budget_allowed(self, household):
        category = CategoryFactory(household=household)
        budget_a = BudgetFactory(household=household, name='January 2026')
        budget_b = BudgetFactory(household=household, name='February 2026')
        BudgetLineFactory(budget=budget_a, category=category)

        other = BudgetLineFactory(budget=budget_b, category=category)

        assert other.id is not None
