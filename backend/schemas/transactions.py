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
    Any deduplication logic (for example, when importing from CSV) is handled
    by backend services and is not exposed through this schema.

    ``label_id``, ``label_name``, and ``label_color`` are derived from the
    related Label FK. All three are None when no label is assigned.
    """

    id: int
    date: str
    concept: str
    amount: float
    label_id: int | None
    label_name: str | None
    label_color: str | None
    category: str | None
    additional_labels: str | None
    source: str
    account_id: int
    account_name: str
    bank_name: str
    imported_at: str


class TransactionCreateRequest(Schema):
    """Request schema for manually creating a transaction.
    The transaction will be deduplicated against existing transactions in the
    same account using the same SHA-256 strategy as CSV imports. If a user
    manually creates a transaction that matches an existing one (based on this
    dedupe hash), the API will reject the request as a duplicate instead of
    creating another record (typically with a 400 Bad Request response).

    The account_id must belong to an account within the user's household.
    The response will include the created transaction's ID when a new
    transaction is successfully created.

    Example: If "Mario's 360 Savings" already has a transaction on 2026-01-15
    for $45.50 with concept "TRADER JOES", then attempting to create another
    transaction with those same values for that account will not create a new
    record and will instead result in a duplicate-transaction error (400 Bad
    Request).

    This prevents both accidental duplicates and cross-tenant ID collisions.
    """

    account_id: int
    date: date
    concept: str
    amount: float


class TransactionUpdateRequest(Schema):
    """Request schema for editing a transaction.

    ``concept`` and ``label_id`` are independently optional — either or both
    may be provided in a single PATCH. Omitting a field leaves it unchanged.

    ``label_id`` may be set to null to explicitly remove the label from a
    transaction. Date, amount, and account are immutable — if those need to
    change, delete and re-create the transaction.
    """

    concept: str | None = None
    label_id: int | None = None
