import pytest
from django.db.models import ProtectedError
from django.db.utils import IntegrityError

from transactions.constants import HandlerKeys
from transactions.handlers.accounts import ACCOUNT_HANDLERS
from transactions.models import Account, AccountType, Bank, Label, Transaction
from users.models import Household

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def household(db):
    return Household.objects.create(name='Smith Family')


@pytest.fixture
def other_household(db):
    return Household.objects.create(name='Jones Family')


@pytest.fixture
def bank(db):
    # Use seeded bank for system-defined data
    return Bank.objects.get(name='SoFi')


@pytest.fixture
def account_type(db, bank):
    # Use seeded account type for system-defined data
    return AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)


@pytest.fixture
def account(db, account_type, household):
    # Create a test-only account for CRUD tests
    return Account.objects.create(
        name='Account Test Savings',
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def label(db, household):
    return Label.objects.create(
        name='Groceries',
        color='#FF5733',
        household=household,
    )


@pytest.fixture
def transaction(db, account):
    return Transaction.objects.create(
        dedupe_hash='abc123' * 10 + 'ab',  # 64 chars
        raw_data=None,
        source=Transaction.Source.IMPORT,
        date='2026-01-15',
        concept='TRADER JOES',
        amount=-45.50,
        account=account,
    )


# ── Bank ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBank:
    def test_can_be_retrieved(self, bank):
        assert bank.pk is not None

    def test_string_representation(self, bank):
        assert str(bank) == 'SoFi'

    def test_name_must_be_unique(self, bank):
        with pytest.raises(IntegrityError):
            Bank.objects.create(name='SoFi')

    def test_logo_is_optional(self):
        bank = Bank.objects.create(name='Test Bank')
        assert not bank.logo

    def test_cannot_be_deleted_with_account_types(self):
        account_type = AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)
        with pytest.raises(ProtectedError):
            account_type.bank.delete()


# ── AccountType ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAccountType:
    def test_can_be_retrieved(self, account_type):
        assert account_type.pk is not None

    def test_string_representation(self, account_type):
        assert str(account_type) == 'SoFi — SoFi Savings'

    def test_belongs_to_a_bank(self, account_type, bank):
        assert account_type.bank == bank

    def test_handler_key_must_be_unique(self, account_type, bank):
        # Attempting to create a duplicate raises IntegrityError
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name='Duplicate',
                handler_key=account_type.handler_key,
                bank=bank,
            )

    def test_name_must_be_unique_per_bank(self, account_type, bank):
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name=account_type.name,
                handler_key='some-other-key',
                bank=bank,
            )

    def test_cannot_be_deleted_with_accounts(self, account_type, account):
        # Ensure there is at least one account linked to this account type
        assert account.account_type == account_type
        with pytest.raises(ProtectedError):
            account_type.delete()


# ── Account ───────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAccount:
    def test_can_be_created(self, account):
        assert account.pk is not None

    def test_string_representation(self, account):
        assert str(account) == 'SoFi — Account Test Savings'

    def test_belongs_to_an_account_type(self, account, account_type):
        assert account.account_type == account_type

    def test_belongs_to_a_household(self, account, household):
        assert account.household == household

    def test_handler_key_resolved_through_account_type(self, account):
        assert account.handler_key == account.account_type.handler_key

    def test_name_must_be_unique_per_household(self, account, account_type, household):
        with pytest.raises(IntegrityError):
            Account.objects.create(
                name=account.name,
                account_type=account_type,
                household=household,
            )

    def test_same_name_allowed_in_different_households(self, account_type, account):
        other_household = Household.objects.create(name='Jones Family')
        other_account = Account.objects.create(
            name=account.name,
            account_type=account_type,
            household=other_household,
        )
        assert other_account.pk is not None

    def test_two_accounts_of_same_type_allowed_in_household(self, account_type, household):
        Account.objects.create(
            name='Account 360 Savings',
            account_type=account_type,
            household=household,
        )
        Account.objects.create(
            name="Partner's 360 Savings",
            account_type=account_type,
            household=household,
        )
        assert Account.objects.filter(household=household).count() == 2

    def test_cannot_be_deleted_with_transactions(self, transaction):
        with pytest.raises(ProtectedError):
            transaction.account.delete()


# ── Label ─────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestLabel:
    def test_can_be_created(self, label):
        assert label.pk is not None

    def test_string_representation(self, label, household):
        assert str(label) == f'{household.name} — {label.name}'

    def test_color_defaults_to_grey(self, household):
        label = Label.objects.create(name='No Color', household=household)
        assert label.color == '#6B7280'

    def test_category_defaults_to_empty_string(self, household):
        label = Label.objects.create(name='No Category', household=household)
        assert label.category == ''

    def test_belongs_to_household(self, label, household):
        assert label.household == household

    def test_name_must_be_unique_per_household(self, household):
        Label.objects.create(name='Groceries', household=household)
        with pytest.raises(IntegrityError):
            Label.objects.create(name='Groceries', household=household)

    def test_same_name_allowed_in_different_households(self, household, other_household):
        Label.objects.create(name='Groceries', household=household)
        label2 = Label.objects.create(name='Groceries', household=other_household)
        assert label2.pk is not None

    def test_ordered_by_category_then_name(self, household):
        Label.objects.create(name='Groceries', category='Food', household=household)
        Label.objects.create(name='Bars', category='Food', household=household)
        Label.objects.create(name='Electricity', category='Utilities', household=household)

        labels = list(Label.objects.filter(household=household))
        names = [label.name for label in labels]

        assert names.index('Bars') < names.index('Groceries')
        assert names.index('Groceries') < names.index('Electricity')

    def test_deleted_with_household(self, label, household):
        label_id = label.pk
        household.delete()
        assert not Label.objects.filter(pk=label_id).exists()


# ── Transaction.label FK ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTransactionLabel:
    def test_transaction_can_have_a_label(self, account, label):
        tx = Transaction.objects.create(
            dedupe_hash='a' * 64,
            date='2026-03-01',
            concept='TRADER JOES',
            amount=-42.57,
            account=account,
            label=label,
        )
        assert tx.label == label

    def test_label_is_null_by_default(self, account):
        tx = Transaction.objects.create(
            dedupe_hash='b' * 64,
            date='2026-03-01',
            concept='AMAZON',
            amount=-19.99,
            account=account,
        )
        assert tx.label is None

    def test_label_set_to_null_when_label_is_deleted(self, account, label):
        tx = Transaction.objects.create(
            dedupe_hash='c' * 64,
            date='2026-03-01',
            concept='TRADER JOES',
            amount=-42.57,
            account=account,
            label=label,
        )
        label.delete()
        tx.refresh_from_db()
        assert tx.label is None

    def test_transaction_is_preserved_when_label_is_deleted(self, account, label):
        tx = Transaction.objects.create(
            dedupe_hash='d' * 64,
            date='2026-03-01',
            concept='TRADER JOES',
            amount=-42.57,
            account=account,
            label=label,
        )
        label.delete()
        assert Transaction.objects.filter(pk=tx.pk).exists()

    def test_label_accessible_through_reverse_relation(self, account, label):
        tx = Transaction.objects.create(
            dedupe_hash='e' * 64,
            date='2026-03-01',
            concept='TRADER JOES',
            amount=-42.57,
            account=account,
            label=label,
        )
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

    def test_label_is_not_overwritten_on_reimport(self, transaction, household):
        label = Label.objects.create(name='Essential', household=household)
        transaction.label = label
        transaction.save()
        _, created = Transaction.objects.get_or_create(
            account=transaction.account,
            dedupe_hash=transaction.dedupe_hash,
            defaults={
                'label': None,
                'date': transaction.date,
                'concept': transaction.concept,
                'amount': transaction.amount,
            },
        )
        assert not created
        transaction.refresh_from_db()
        assert transaction.label == label

    def test_household_accessible_through_transaction(self, transaction, household):
        assert transaction.account.household == household

    def test_handler_key_accessible_through_transaction(self, transaction):
        assert transaction.account.handler_key == HandlerKeys.SOFI_SAVINGS

    def test_source_defaults_to_import(self, transaction):
        assert transaction.source == Transaction.Source.IMPORT

    def test_source_is_not_overwritten_on_reimport(self, transaction):
        transaction.source = Transaction.Source.MANUAL
        transaction.save()
        _, created = Transaction.objects.get_or_create(
            account=transaction.account,
            dedupe_hash=transaction.dedupe_hash,
            defaults={
                'source': Transaction.Source.IMPORT,
                'date': transaction.date,
                'concept': transaction.concept,
                'amount': transaction.amount,
            },
        )
        assert not created
        transaction.refresh_from_db()
        assert transaction.source == Transaction.Source.MANUAL


# ── Smoke Test ──────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_all_seeded_account_types_have_handlers():
    """
    Ensure every AccountType seeded via migration has a matching handler in ACCOUNT_HANDLERS.
    """
    for account_type in AccountType.objects.all():
        assert account_type.handler_key in ACCOUNT_HANDLERS, (
            f'{account_type.handler_key} has no corresponding handler!'
        )
