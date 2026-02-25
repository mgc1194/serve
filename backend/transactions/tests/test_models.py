import pytest
from django.db.models import ProtectedError
from django.db.utils import IntegrityError

from users.models import Household
from transactions.constants import HandlerKeys
from transactions.models import Bank, AccountType, Account, Transaction
from transactions.handlers.accounts import ACCOUNT_HANDLERS


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def household(db):
    return Household.objects.create(name='Smith Family')


@pytest.fixture
def bank(db):
    # Use seeded bank for system-defined data
    return Bank.objects.get(name="SoFi")


@pytest.fixture
def account_type(db, bank):
    # Use seeded account type for system-defined data
    return AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)


@pytest.fixture
def account(db, account_type, household):
    # Create a test-only account for CRUD tests
    return Account.objects.create(
        name="Account Test Savings",
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def transaction(db, account):
    return Transaction.objects.create(
        id='abc123' * 5 + 'ab',  # 32 chars
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
        assert str(bank) == "SoFi"

    def test_name_must_be_unique(self, bank):
        with pytest.raises(IntegrityError):
            Bank.objects.create(name="SoFi")

    def test_logo_is_optional(self):
        bank = Bank.objects.create(name="Test Bank")
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
        assert str(account_type) == "SoFi — SoFi Savings"

    def test_belongs_to_a_bank(self, account_type, bank):
        assert account_type.bank == bank

    def test_handler_key_must_be_unique(self, account_type, bank):
        # Attempting to create a duplicate raises IntegrityError
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name="Duplicate",
                handler_key=account_type.handler_key,
                bank=bank,
            )

    def test_name_must_be_unique_per_bank(self, account_type, bank):
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name=account_type.name,
                handler_key="some-other-key",
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
        assert str(account) == "SoFi — Account Test Savings"

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
            name="Account 360 Savings",
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

    def test_label_is_not_overwritten_on_reimport(self, transaction):
        transaction.label = 'Essential'
        transaction.save()
        _, created = Transaction.objects.get_or_create(
            id=transaction.id,
            defaults={
                'label': None,
                'date': transaction.date,
                'concept': transaction.concept,
                'amount': transaction.amount,
                'account': transaction.account,
            }
        )
        assert not created
        transaction.refresh_from_db()
        assert transaction.label == 'Essential'

    def test_household_accessible_through_transaction(self, transaction, household):
        assert transaction.account.household == household

    def test_handler_key_accessible_through_transaction(self, transaction):
        assert transaction.account.handler_key == HandlerKeys.SOFI_SAVINGS


# ── Smoke Test ──────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_all_seeded_account_types_have_handlers():
    """
    Ensure every AccountType seeded via migration has a matching handler in ACCOUNT_HANDLERS.
    """
    for account_type in AccountType.objects.all():
        assert account_type.handler_key in ACCOUNT_HANDLERS, (
            f"{account_type.handler_key} has no corresponding handler!"
        )
