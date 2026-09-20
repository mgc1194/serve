"""
banking/models.py — Bank, AccountType, and Account models.

Moved from transactions/models.py. Physical DB table names are unchanged
(banks, account_types, accounts) — this is a code-level reorganisation only.
"""

from django.db import models

from banking.constants import HandlerKeys
from users.models import Household


class Bank(models.Model):
    """
    Represents a financial institution.
    Supported banks are system determined. Adding, editing or removing
    institutions should be performed through migrations.
    """

    name = models.CharField(max_length=255, unique=True)
    logo = models.ImageField(upload_to='banks/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'banks'

    def __str__(self):
        return self.name


class AccountType(models.Model):
    """
    Represents a type of account offered by a bank (e.g. 360 Performance Savings).
    Maps to a handler in ACCOUNT_HANDLERS via handler_key.
    Each bank can offer multiple account types, each with a unique handler.
    """

    HANDLER_CHOICES = [
        (HandlerKeys.SOFI_SAVINGS, 'SoFi Savings'),
        (HandlerKeys.SOFI_CHECKING, 'SoFi Checking'),
        (HandlerKeys.CO_CHECKING, '360 Checking'),
        (HandlerKeys.CO_SAVINGS, '360 Performance Savings'),
        (HandlerKeys.CO_QUICKSILVER, 'Quicksilver Credit Card'),
        (HandlerKeys.WF_CHECKING, 'Checking'),
        (HandlerKeys.WF_SAVINGS, 'Savings'),
        (HandlerKeys.CHASE, 'Chase Card'),
        (HandlerKeys.DISCOVER, 'Discover Card'),
        (HandlerKeys.AMEX_DELTA, 'Delta SkyMiles Card'),
        (HandlerKeys.CITI_COSTCO, 'Costco Anywhere Visa Card'),
    ]

    name = models.CharField(max_length=255)
    handler_key = models.CharField(
        max_length=255,
        unique=True,
        choices=HANDLER_CHOICES,
    )
    bank = models.ForeignKey(
        Bank,
        on_delete=models.PROTECT,
        related_name='account_types',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'account_types'
        unique_together = [['bank', 'name']]

    def __str__(self):
        return f'{self.bank.name} — {self.name}'

    def get_handler(self):
        """Returns the handler associated with the selected account type."""
        from banking.handlers.accounts import ACCOUNT_HANDLERS

        return ACCOUNT_HANDLERS[self.handler_key]


class Account(models.Model):
    """
    Represents a specific account belonging to a household.
    Name is user-editable to distinguish multiple accounts of the same type
    (e.g. "Mario's 360 Savings" and "Partner's 360 Savings").
    The handler is resolved through account_type.handler_key.
    """

    name = models.CharField(max_length=255)
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='accounts')
    household = models.ForeignKey(Household, on_delete=models.PROTECT, related_name='accounts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts'
        unique_together = [['household', 'name']]

    def __str__(self):
        return f'{self.account_type.bank.name} — {self.name}'

    @property
    def handler_key(self):
        return self.account_type.handler_key
