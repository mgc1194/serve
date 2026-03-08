"""
schemas/transactions.py — API schemas for transaction-related endpoints.

Schemas define the API contract independently from the database models.
"""
from datetime import date

from typing import Optional

from ninja import Schema

class FileImportResult(Schema):
    """Output schema for a CSV file import result."""

    filename: str
    inserted: int
    skipped: int
    total: int
    error: Optional[str] = None


class TransactionSchema(Schema):
    """Output schema for a Transaction."""

    id: str
    date: str
    concept: str
    amount: float
    label: Optional[str]
    category: Optional[str]
    additional_labels: Optional[str]
    account_id: int
    account_name: str
    bank_name: str
    imported_at: str

class TransactionCreateRequest(Schema):
    """Request schema for manually creating a transaction.

    The id is derived server-side from the field values, matching the
    same MD5 hashing strategy used during CSV import so that a manually
    added transaction can never be re-imported as a duplicate.
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

class DetectResponse(Schema):
    """Output schema for an account type detection result."""

    filename: str
    handler_key: Optional[str]
    detected: bool
