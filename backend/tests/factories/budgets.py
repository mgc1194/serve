"""
tests/factories/budgets.py — factory_boy factories for the budgets app.
"""

import factory

from budgets.models import Budget, Category


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f'Category {n}')
    type = Category.Type.SPENDING
    household = factory.SubFactory('tests.factories.HouseholdFactory')


class BudgetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Budget

    name = factory.Sequence(lambda n: f'Budget {n}')
    type = Budget.Type.PERIOD
    period_start = '2026-01-01'
    period_end = '2026-01-31'
    household = factory.SubFactory('tests.factories.HouseholdFactory')
