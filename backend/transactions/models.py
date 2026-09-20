"""
transactions/models.py — Label and Transaction models.

This app owns everything that creates, queries, or mutates a Transaction
row, including labeling, categorization, and (in transactions/utils.py)
the import-time upsert logic.

Bank, AccountType, Account, and all CSV-parsing handler logic live in the
banking app — that app owns accounts, banks, account types, and the
handler registry used to normalize each bank's export format. Transaction
references banking.Account via FK; this is the only cross-app dependency
transactions has on banking.
"""

from django.db import models

from users.models import Household


class Label(models.Model):
    """
    A user-defined label that can be assigned to transactions within a household.

    Labels have a name, an optional hex colour for UI display, and an optional
    category (budgets.Category) that groups related labels under a shared
    budget area (e.g. the "Food & Drinks" category might group "Groceries"
    and "Restaurants" labels). A label belongs to at most one category. Names
    are unique per household so the same name can appear in different
    households without conflict.

    Deleting a label nulls out the label FK on any associated transactions
    rather than cascading — transactions are never removed implicitly.
    Deleting a category similarly nulls out the category FK on any labels
    that referenced it, rather than deleting the labels.
    """

    name = models.CharField(max_length=100)
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text='Hex colour code, e.g. "#FF5733".  Used for UI display only.',
    )
    category = models.ForeignKey(
        'budgets.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='labels',
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
        ordering = ['category__name', 'name']

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
    account = models.ForeignKey(
        'banking.Account',
        on_delete=models.PROTECT,
        related_name='transactions',
    )
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
            models.Index(fields=['account', 'date', 'id'], name='idx_transactions_cursor'),
        ]

    def __str__(self):
        return f'{self.date} — {self.concept} ({self.amount})'
