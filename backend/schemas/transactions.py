"""
schemas/transactions.py — API schemas for transaction-related endpoints.

Schemas define the API contract independently from the database models.
"""

from typing import List, Optional

from ninja import Schema


class AccountTypeSchema(Schema):
    """Output schema for an AccountType."""

    id: int
    name: str
    handler_key: str


class AccountSchema(Schema):
    """Output schema for an Account."""

    id: int
    name: str
    handler_key: str
    account_type: str
    bank_id: int
    bank_name: str


class BankSchema(Schema):
    """Output schema for a Bank, including its account types."""

    id: int
    name: str
    account_types: List[AccountTypeSchema]


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


class DetectResponse(Schema):
    """Output schema for an account type detection result."""

    filename: str
    handler_key: Optional[str]
    detected: bool
