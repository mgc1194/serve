"""
transactions/models.py — Bank, AccountType, Account, Transaction, and Label models.
"""

from django.db import models

from transactions.constants import HandlerKeys
from users.models import Household


class Bank(models.Model):
    """
    Represents a financial institution.
    Suported banks are sytem determined. Adding, edditing or removing
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
        from transactions.handlers.accounts import ACCOUNT_HANDLERS

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


class Label(models.Model):
    """
    A user-defined label that can be assigned to transactions within a household.

    Labels have a name, an optional hex colour for UI
    display, and an optional free-text category that groups related labels
    together (e.g. "Groceries", "Transport").  Names are unique per household
    so the same name can appear in different households without conflict.

    Deleting a label nulls out the label FK on any associated transactions
    rather than cascading — transactions are never removed implicitly.
    """

    name = models.CharField(max_length=100)
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text='Hex colour code, e.g. "#FF5733".  Used for UI display only.',
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Optional grouping for related labels (e.g. "Food", "Bills").',
    )
    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name='labels',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'labels'
        unique_together = [['household', 'name']]
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.household.name} — {self.name}'


class Transaction(models.Model):
    """
    Represents a single financial transaction.

    Primary key is a standard auto-incrementing integer.

    Deduplication is handled by dedupe_hash (SHA-256), scoped to the account
    via a unique constraint on (account, dedupe_hash). This prevents accidental
    duplicates and cross-tenant ID collisions. Note that this constraint applies
    regardless of source — a manual and an imported transaction with the same
    hash cannot coexist in the same account.

    raw_data stores the original CSV row as a JSON string for auditing and hash
    re-derivation. It is None for manually created transactions.

    source distinguishes CSV-imported transactions ('import') from manually
    created ones ('manual'). These are treated as distinct entry points but
    share the same dedup scope.

     label links to a Label instance within the same household. When a Label is
    deleted the FK is set to NULL (SET_NULL) so the transaction is preserved but
    simply becomes unlabelled. Earlier versions of this model used a free-text
    label field; that has now been replaced by the structured ForeignKey.

    category and additional_labels are manually assigned and never overwritten
    on re-import.
    exclude_from_summary is user-controlled and never overwritten on re-import.
    """

    class Source(models.TextChoices):
        IMPORT = 'import', 'Import'
        MANUAL = 'manual', 'Manual'

    dedupe_hash = models.CharField(max_length=64)  # SHA-256, 64 hex chars
    raw_data = models.TextField(null=True, blank=True)  # noqa: DJ001 # audit trail
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.IMPORT)
    date = models.DateField()
    concept = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Structured label FK — the primary way to label a transaction going forward.
    label = models.ForeignKey(
        Label,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
    )

    category = models.CharField(max_length=255, blank=True, null=True)  # noqa: DJ001
    additional_labels = models.TextField(blank=True, null=True)  # noqa: DJ001
    exclude_from_summary = models.BooleanField(
        default=False,
        help_text=(
            'When True this transaction is omitted from summary aggregations. '
            'Use for transfers, loan proceeds, or any amount that would '
            'otherwise distort spending/earnings totals.'
        ),
    )
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='transactions')
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactions'
        constraints = [
            models.UniqueConstraint(
                fields=['account', 'dedupe_hash'], name='unique_transaction_per_account'
            )
        ]
        indexes = [
            models.Index(fields=['date'], name='idx_transactions_date'),
            models.Index(fields=['label'], name='idx_transactions_label'),
            models.Index(fields=['category'], name='idx_transactions_category'),
        ]

    def __str__(self):
        return f'{self.date} — {self.concept} ({self.amount})'
