"""
tests/factories/budgets.py — factory_boy factories for the budgets app.
"""

import datetime

import factory

from budgets.models import Budget, BudgetLine, Category


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
    type = Budget.Type.SPENDING
    period_start = datetime.date(2026, 1, 1)
    period_end = datetime.date(2026, 1, 31)
    household = factory.SubFactory('tests.factories.HouseholdFactory')


class BudgetLineFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BudgetLine

    budget = factory.SubFactory(BudgetFactory)
    category = factory.SubFactory(CategoryFactory)
