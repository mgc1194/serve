import pytest
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError

from users.models import Household
from transactions.models import Bank, AccountType, Account, Transaction


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def household():
    return Household.objects.create(name='Smith Family')


@pytest.fixture
def bank():
    return Bank.objects.create(name='SoFi')


@pytest.fixture
def account_type(bank):
    return AccountType.objects.create(
        name='SoFi Savings',
        handler_key='SoFi Savings',
        bank=bank,
    )


@pytest.fixture
def account(account_type, household):
    return Account.objects.create(
        name="Mario's SoFi Savings",
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def transaction(account):
    return Transaction.objects.create(
        id='abc123' * 5 + 'ab',  # 32 chars
        date='2026-01-15',
        concept='TRADER JOES',
        amount=-45.50,
        account=account,
    )


# ── Bank ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBank:

    def test_can_be_created(self, bank):
        assert bank.pk is not None

    def test_string_representation(self, bank):
        assert str(bank) == 'SoFi'

    def test_name_must_be_unique(self, bank):
        with pytest.raises(IntegrityError):
            Bank.objects.create(name='SoFi')

    def test_logo_is_optional(self):
        bank = Bank.objects.create(name='Chase')
        assert bank.logo.name is None or bank.logo.name == ''

    def test_cannot_be_deleted_with_account_types(self, account_type):
        with pytest.raises(Exception):
            account_type.bank.delete()


# ── AccountType ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAccountType:

    def test_can_be_created(self, account_type):
        assert account_type.pk is not None

    def test_string_representation(self, account_type):
        assert str(account_type) == 'SoFi — SoFi Savings'

    def test_belongs_to_a_bank(self, account_type, bank):
        assert account_type.bank == bank

    def test_handler_key_must_be_unique(self, account_type, bank):
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name='SoFi Savings Duplicate',
                handler_key='SoFi Savings',
                bank=bank,
            )

    def test_name_must_be_unique_per_bank(self, account_type, bank):
        with pytest.raises(IntegrityError):
            AccountType.objects.create(
                name='SoFi Savings',
                handler_key='SoFi Savings Alt',
                bank=bank,
            )

    # def test_invalid_handler_key_raises_validation_error(self, bank):
    #     account_type = AccountType(
    #         name='Invalid',
    #         handler_key='NonExistentHandler',
    #         bank=bank,
    #     )
    #     with pytest.raises(ValidationError, match='not a valid handler key'):
    #         account_type.clean()

    def test_valid_handler_key_passes_validation(self, bank):
        account_type = AccountType(
            name='SoFi Savings',
            handler_key='SoFi Savings',
            bank=bank,
        )
        account_type.clean()  # Should not raise

    def test_cannot_be_deleted_with_accounts(self, account):
        with pytest.raises(Exception):
            account.account_type.delete()


# ── Account ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAccount:

    def test_can_be_created(self, account):
        assert account.pk is not None

    def test_string_representation(self, account):
        assert str(account) == "SoFi — Mario's SoFi Savings"

    def test_belongs_to_an_account_type(self, account, account_type):
        assert account.account_type == account_type

    def test_belongs_to_a_household(self, account, household):
        assert account.household == household

    def test_handler_key_resolved_through_account_type(self, account):
        assert account.handler_key == 'SoFi Savings'

    def test_name_must_be_unique_per_household(self, account, account_type, household):
        with pytest.raises(IntegrityError):
            Account.objects.create(
                name="Mario's SoFi Savings",
                account_type=account_type,
                household=household,
            )

    def test_same_name_allowed_in_different_households(self, account_type, account):
        other_household = Household.objects.create(name='Jones Family')
        other_account = Account.objects.create(
            name="Mario's SoFi Savings",
            account_type=account_type,
            household=other_household,
        )
        assert other_account.pk is not None

    def test_two_accounts_of_same_type_allowed_in_household(self, account_type, household):
        Account.objects.create(
            name="Mario's 360 Savings",
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
        with pytest.raises(Exception):
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
                'date': '2026-01-15',
                'concept': 'TRADER JOES',
                'amount': -45.50,
                'account': transaction.account,
            }
        )
        assert not created
        transaction.refresh_from_db()
        assert transaction.label == 'Essential'

    def test_household_accessible_through_transaction(self, transaction, household):
        assert transaction.account.household == household

    def test_handler_key_accessible_through_transaction(self, transaction):
        assert transaction.account.handler_key == 'SoFi Savings'
