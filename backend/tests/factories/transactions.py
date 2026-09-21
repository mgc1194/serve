"""
tests/factories/transactions.py — Factories for Label, Transaction.

Bank, AccountType, and Account factories have moved to banking.py as part
of the banking app extraction.
"""

import secrets
from datetime import date

import factory

from transactions.models import Label, Transaction

from .banking import AccountFactory
from .users import HouseholdFactory

# ── Label ─────────────────────────────────────────────────────────────────────


class LabelFactory(factory.django.DjangoModelFactory):
    """
    Creates a Label within a generated Household.

    Label names are unique per household; the Sequence guarantees no
    collisions when multiple labels are created for the same household.
    Override for named labels:
        LabelFactory(name='Groceries', household=my_household)
    """

    class Meta:
        model = Label

    name = factory.Sequence(lambda n: f'Label {n}')
    color = '#6B7280'
    household = factory.SubFactory(HouseholdFactory)


# ── Transaction ───────────────────────────────────────────────────────────────


class TransactionFactory(factory.django.DjangoModelFactory):
    """
    Creates a Transaction linked to a generated Account.

    The dedupe_hash is a random 64-hex string so parallel tests never
    collide on the (account, dedupe_hash) unique constraint.

    Common overrides:
        TransactionFactory(account=my_account, amount=-99.99, date=date(2026, 3, 1))
        TransactionFactory(label=my_label)
    """

    class Meta:
        model = Transaction

    dedupe_hash = factory.LazyFunction(lambda: secrets.token_hex(32))  # 64 hex chars
    date = factory.LazyFunction(date.today)
    concept = factory.Sequence(lambda n: f'TRANSACTION {n}')
    amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=False)
    source = Transaction.Source.IMPORT
    raw_data = None
    account = factory.SubFactory(AccountFactory)
    label = None
