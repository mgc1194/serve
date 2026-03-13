"""
schemas/transactions.py — API schemas for transaction-related endpoints.

Schemas define the API contract independently from the database models.
"""

from datetime import date

from ninja import Schema


class FileImportResult(Schema):
    """Output schema for a CSV file import result."""

    filename: str
    inserted: int
    skipped: int
    total: int
    error: str | None = None


class TransactionSchema(Schema):
    """Output schema for a Transaction.
    The ``id`` field is the auto-incrementing primary key from the database.
    Deduplication is handled separately via a server-side ``dedupe_hash``
    (SHA-256) that is computed from the normalized transaction data.
    """

    id: int
    date: str
    concept: str
    amount: float
    label: str | None
    category: str | None
    additional_labels: str | None
    account_id: int
    account_name: str
    bank_name: str
    imported_at: str


class TransactionCreateRequest(Schema):
    """Request schema for manually creating a transaction.
    The transaction will be deduplicated against existing transactions in the
    same account using the same SHA-256 strategy as CSV imports — so if a
    user manually creates a transaction that matches an existing one, it will
    be skipped rather than duplicated.

    The account_id must belong to an account within the user's household.
    The response will include the created transaction's ID, which is useful
    for confirming the deduplication behavior.

    Example: If "Mario's 360 Savings" already has a transaction on 2026-01-15
    for $45.50 with concept "TRADER JOES", then attempting to create another
    transaction with those same values for that account will not create a new
    record but will return the existing one instead.

    This prevents both accidental duplicates and cross-tenant ID collisions.
    """

    account_id: int
    date: date
    concept: str
    amount: float


class TransactionUpdateRequest(Schema):
    """Request schema for editing a transaction.

    Only concept (description) is editable after creation.
    Date, amount, and account are immutable — if those need to change,
    delete and re-create the transaction.
    """

    concept: str
