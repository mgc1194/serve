"""
tests/conftest.py — Shared pytest fixtures for the entire test suite.

All core fixtures are defined here once and imported automatically by pytest.
Individual test modules should only define fixtures that are genuinely
local to that module (e.g. bulk data sets, mocks, or specialised variants).

Fixture relationships
─────────────────────
    other_household ← other_user
    household ← alice (member)
               seth  (non-member, used for 403 tests)
    household → account_type → account
    household → category → label
    account   → transaction
    account   → labeled_transaction (has label)
"""

import pytest

from banking.constants import HandlerKeys
from tests.factories import (
    AccountFactory,
    AccountTypeFactory,
    BankFactory,
    CategoryFactory,
    HouseholdFactory,
    LabelFactory,
    TransactionFactory,
    UserFactory,
)

# ── Households ────────────────────────────────────────────────────────────────


@pytest.fixture
def household(db):
    """Primary household used across most tests."""
    return HouseholdFactory(name='Alice Household')


@pytest.fixture
def other_household(db):
    """A second, separate household — used for isolation / 403 tests."""
    return HouseholdFactory(name='Seth Household')


# ── Users ─────────────────────────────────────────────────────────────────────


@pytest.fixture
def alice(db, household):
    """A user who is a member of ``household``."""
    user = UserFactory(username='alice', email='alice@example.com')
    user.households.add(household)
    return user


@pytest.fixture
def seth(db, other_household):
    """A user who belongs to ``other_household`` only — not ``household``."""
    user = UserFactory(username='seth', email='seth@example.com')
    user.households.add(other_household)
    return user


# ── Account type / account ────────────────────────────────────────────────────


@pytest.fixture
def bank(db):
    """The seeded SoFi bank (fetched, not created)."""
    return BankFactory(name='SoFi')


@pytest.fixture
def account_type(db):
    """The seeded SoFi Savings account type (fetched, not created)."""
    return AccountTypeFactory(handler_key=HandlerKeys.SOFI_SAVINGS)


@pytest.fixture
def account(db, account_type, household):
    """An Account belonging to ``household``."""
    return AccountFactory(
        name='Test Account',
        account_type=account_type,
        household=household,
    )


# ── Label ─────────────────────────────────────────────────────────────────────


@pytest.fixture
def category(db, household):
    """A Food category in ``household``."""
    return CategoryFactory(name='Food', household=household)


@pytest.fixture
def label(db, household, category):
    """A Groceries label in ``household``, under the Food category."""
    return LabelFactory(
        name='Groceries',
        color='#16a34a',
        category=category,
        household=household,
    )


@pytest.fixture
def other_label(db, other_household):
    """A label in ``other_household`` — used for cross-household isolation tests."""
    return LabelFactory(
        name='Transport',
        color='#2563eb',
        household=other_household,
    )


# ── Transactions ──────────────────────────────────────────────────────────────


@pytest.fixture
def transaction(db, account):
    """A single unlabelled transaction in ``account``."""
    return TransactionFactory(
        dedupe_hash='abc123' * 10 + 'abcd',  # stable hash for tests that assert on it
        date='2026-01-15',
        concept='TRADER JOES',
        amount=-45.50,
        account=account,
    )


@pytest.fixture
def labeled_transaction(db, account, label):
    """A transaction in ``account`` with ``label`` assigned."""
    return TransactionFactory(
        dedupe_hash='def456' * 10 + 'defg',  # stable hash
        date='2026-01-16',
        concept='WHOLE FOODS',
        amount=-31.20,
        account=account,
        label=label,
    )
