"""
schemas/transactions.py — API schemas for transaction-related endpoints.
"""

import base64
import json
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

    ``exclude_from_summary`` — when True this transaction is omitted from all
    summary aggregations (earnings, spending, and balance).
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
    exclude_from_summary: bool
    source: str
    account_id: int
    account_name: str
    bank_name: str
    imported_at: str


class PaginatedTransactionsSchema(Schema):
    """Paginated response for the transaction list endpoint.

    results         — the current page of transactions
    count           — total number of matching transactions (for display)
    next_cursor     — opaque cursor string to fetch the next page; null at end
    previous_cursor — opaque cursor string to fetch the previous page; null at start
    sort            — the active sort field
    sort_dir        — the active sort direction
    """

    results: list[TransactionSchema]
    count: int
    next_cursor: str | None
    previous_cursor: str | None
    sort: str
    sort_dir: str


def encode_cursor(date_str: str, tx_id: int) -> str:
    """Encodes a (date, id) pair into an opaque base64 cursor string."""
    payload = json.dumps({'date': date_str, 'id': tx_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> tuple[str, int] | None:
    """Decodes a cursor string back to (date_str, id). Returns None if invalid."""
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return payload['date'], int(payload['id'])
    except Exception:
        return None


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

    All fields are independently optional — omitting a field leaves it
    unchanged. Setting ``label_id`` to null explicitly removes the label.
    ``exclude_from_summary`` must be a boolean when provided; omitting it
    leaves the existing value unchanged.

    Date, amount, and account are immutable — delete and re-create to
    change those.
    """

    concept: str | None = None
    label_id: int | None = None
    exclude_from_summary: bool | None = None
