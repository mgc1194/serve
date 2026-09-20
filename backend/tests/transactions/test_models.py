"""
tests/transactions/test_models.py — Unit tests for transaction-domain models.

Bank, AccountType, and Account tests have moved to
tests/banking/test_models.py as part of the banking app extraction.
"""

import pytest
from django.db.utils import IntegrityError

from tests.factories import (
    AccountFactory,
    CategoryFactory,
    HouseholdFactory,
    LabelFactory,
    TransactionFactory,
)
from transactions.models import Label, Transaction

# ── Module-local fixtures ─────────────────────────────────────────────────────
# The shared conftest already provides: household, other_household, account_type,
# account, label, transaction. Only fixtures that are specific to model tests
# (e.g. "Smith Family" name, or second household) are defined below.


@pytest.fixture
def household(db):
    """Override the shared fixture to use the canonical Smith Family name."""
    return HouseholdFactory(name='Smith Family')


@pytest.fixture
def other_household(db):
    return HouseholdFactory(name='Jones Family')


# ── Label ─────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLabel:
    def test_can_be_created(self, label):
        assert label.pk is not None

    def test_string_representation(self, label, household):
        assert str(label) == f'{household.name} — {label.name}'

    def test_color_defaults_to_grey(self, household):
        label = LabelFactory(name='No Color', household=household)
        assert label.color == '#6B7280'

    def test_category_defaults_to_none(self, household):
        label = LabelFactory(name='No Category', household=household)
        assert label.category is None

    def test_belongs_to_household(self, label, household):
        assert label.household == household

    def test_name_must_be_unique_per_household(self, household):
        LabelFactory(name='Groceries', household=household)
        with pytest.raises(IntegrityError):
            Label.objects.create(name='Groceries', household=household)

    def test_same_name_allowed_in_different_households(self, household, other_household):
        LabelFactory(name='Groceries', household=household)
        label2 = LabelFactory(name='Groceries', household=other_household)
        assert label2.pk is not None

    def test_ordered_by_category_then_name(self, household):
        food = CategoryFactory(name='Food', household=household)
        utilities = CategoryFactory(name='Utilities', household=household)
        LabelFactory(name='Groceries', category=food, household=household)
        LabelFactory(name='Bars', category=food, household=household)
        LabelFactory(name='Electricity', category=utilities, household=household)

        labels = list(Label.objects.filter(household=household))
        names = [label.name for label in labels]

        assert names.index('Bars') < names.index('Groceries')
        assert names.index('Groceries') < names.index('Electricity')

    def test_deleted_with_household(self, label, household):
        label_id = label.pk
        household.delete()
        assert not Label.objects.filter(pk=label_id).exists()

    def test_category_is_optional(self, household):
        label = LabelFactory(name='Uncategorised', category=None, household=household)
        assert label.pk is not None
        assert label.category is None

    def test_category_belongs_to_a_household(self, label, category):
        assert label.category == category

    def test_category_set_to_null_when_category_is_deleted(self, household):
        category = CategoryFactory(name='Food', household=household)
        label = LabelFactory(name='Groceries', category=category, household=household)
        category.delete()
        label.refresh_from_db()
        assert label.category is None

    def test_label_is_preserved_when_category_is_deleted(self, household):
        category = CategoryFactory(name='Food', household=household)
        label = LabelFactory(name='Groceries', category=category, household=household)
        category.delete()
        assert Label.objects.filter(pk=label.pk).exists()

    def test_category_accessible_through_reverse_relation(self, household):
        category = CategoryFactory(name='Food', household=household)
        label = LabelFactory(name='Groceries', category=category, household=household)
        assert label in category.labels.all()


# ── Transaction.label FK ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTransactionLabel:
    def test_transaction_can_have_a_label(self, account, label):
        tx = TransactionFactory(account=account, label=label)
        assert tx.label == label

    def test_label_is_null_by_default(self, account):
        tx = TransactionFactory(account=account)
        assert tx.label is None

    def test_label_set_to_null_when_label_is_deleted(self, account, label):
        tx = TransactionFactory(account=account, label=label)
        label.delete()
        tx.refresh_from_db()
        assert tx.label is None

    def test_transaction_is_preserved_when_label_is_deleted(self, account, label):
        tx = TransactionFactory(account=account, label=label)
        label.delete()
        assert Transaction.objects.filter(pk=tx.pk).exists()

    def test_label_accessible_through_reverse_relation(self, account, label):
        tx = TransactionFactory(account=account, label=label)
        assert tx in label.transactions.all()


# ── Transaction ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTransaction:
    def test_can_be_created(self, transaction):
        assert transaction.pk is not None

    def test_string_representation(self, transaction):
        assert '2026-01-15' in str(transaction)
        assert 'TRADER JOES' in str(transaction)

    def test_belongs_to_an_account(self, transaction, account):
        assert transaction.account == account

    def test_label_is_optional(self, transaction):
        assert transaction.label is None

    def test_category_is_optional(self, transaction):
        assert transaction.category is None

    def test_additional_labels_is_optional(self, transaction):
        assert transaction.additional_labels is None

    def test_dedupe_hash_must_be_unique_per_account(self, account):
        tx = TransactionFactory(account=account)
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                dedupe_hash=tx.dedupe_hash,
                date='2026-02-01',
                concept='DUPLICATE',
                amount=-10.00,
                account=account,
            )

    def test_same_dedupe_hash_allowed_in_different_accounts(self, account, account_type, household):
        tx = TransactionFactory(account=account)
        second_account = AccountFactory(
            name='Second Account', account_type=account_type, household=household
        )
        tx2 = TransactionFactory(dedupe_hash=tx.dedupe_hash, account=second_account)
        assert tx2.pk is not None
