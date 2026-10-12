"""
tests/api/v1/summary/conftest.py — Shared fixtures for GET /api/v1/summary/ tests.

Summary tests use Django's full test Client (not NinjaTestClient) because the
summary endpoint is mounted on the full URL. Labels and accounts are created
freshly here because the summary fixture set differs from the transaction set
(multiple categories, income vs spending distinction, etc.).

Root conftest provides: household, other_household, account_type.
"""

import pytest
from django.test import Client

from budgets.models import Category
from tests.factories import AccountFactory, CategoryFactory, LabelFactory, UserFactory
from transactions.models import Transaction


@pytest.fixture
def user(db, household):
    u = UserFactory(email='test@example.com', username='test@example.com')
    u.set_password('Password1!')
    u.save()
    u.households.add(household)
    return u


@pytest.fixture
def other_user(db, other_household):
    u = UserFactory(email='other@example.com', username='other@example.com')
    u.set_password('Password1!')
    u.save()
    u.households.add(other_household)
    return u


@pytest.fixture
def account(db, account_type, household):
    return AccountFactory(name='Test Savings', account_type=account_type, household=household)


@pytest.fixture
def food_label(db, household):
    category = CategoryFactory(name='Food', household=household)
    return LabelFactory(name='Groceries', color='#16a34a', category=category, household=household)


@pytest.fixture
def income_label(db, household):
    category = CategoryFactory(name='Income', type=Category.Type.EARNING, household=household)
    return LabelFactory(name='Income', color='#036628', category=category, household=household)


@pytest.fixture
def transport_label(db, household):
    category = CategoryFactory(name='Transport', household=household)
    return LabelFactory(name='Gas', color='#2563eb', category=category, household=household)


@pytest.fixture
def earnings_label(db, household):
    category = CategoryFactory(name='Earnings', type=Category.Type.EARNING, household=household)
    return LabelFactory(name='Paycheck', color='#059669', category=category, household=household)


@pytest.fixture
def no_category_label(db, household):
    return LabelFactory(name='Miscellaneous', color='#6B7280', category=None, household=household)


@pytest.fixture
def misc_spending_label(db, household):
    """A label under a *spending*-type category whose own transactions can
    still net positive (e.g. a deposit or refund) — regresses to a bug where
    the earnings/spending split ignored the category's type entirely and
    bucketed purely by the label's net sign, so a positive-total label landed
    in Earnings even when its category was explicitly marked Spending."""
    category = CategoryFactory(
        name='Miscellaneous', type=Category.Type.SPENDING, household=household
    )
    return LabelFactory(
        name='Deposits & Transfers', color='#6B7280', category=category, household=household
    )


@pytest.fixture
def earning_category_refund_label(db, household):
    """A label under an *earning*-type category whose own transactions can
    still net negative (e.g. a clawback) — the mirror case of
    misc_spending_label, confirming the category type wins in both
    directions, not just spending-stays-spending."""
    category = CategoryFactory(name='Bonus', type=Category.Type.EARNING, household=household)
    return LabelFactory(name='Clawback', color='#dc2626', category=category, household=household)


@pytest.fixture
def auth_client(db, user):
    client = Client()
    client.force_login(user)
    return client


def _tx(account, amount, label=None, date='2026-03-15', concept='TEST', suffix=''):
    """Lightweight helper for creating summary-test transactions."""
    import hashlib

    unique = f'{account.id}|{date}|{concept}|{amount}|{suffix}'
    dedupe_hash = hashlib.sha256(unique.encode()).hexdigest()
    return Transaction.objects.create(
        dedupe_hash=dedupe_hash,
        date=date,
        concept=concept,
        amount=amount,
        label=label,
        account=account,
    )
