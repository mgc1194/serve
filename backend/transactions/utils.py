"""
transactions/utils.py — Transaction import utilities and domain-level business logic.

This module contains non-model business logic used during transaction
imports, including:

- inferring an account type from uploaded CSV filenames
- inserting (upserting) transactions while preserving user-managed fields

Account type detection relies on canonical handler keys defined in
transactions.constants.HandlerKeys. These keys are system-defined,
seeded via data migrations, and resolved at runtime through the account
handler registry.

This module intentionally does not contain parsing logic or persistence
rules beyond transaction insertion; CSV parsing and normalization are
handled by account handlers, while referential integrity is enforced at
the model layer.
"""

import logging
from typing import Optional

import pandas as pd

from .models import Account, Transaction
from transactions.constants import HandlerKeys

logger = logging.getLogger(__name__)


# ── Account detection ─────────────────────────────────────────────────────────

# Maps filename substrings to handler_key values in ACCOUNT_HANDLERS.
# Order matters — more specific patterns should come first.
FILE_DETECTION_MAP = {
    '360Checking': HandlerKeys.CO_CHECKING,
    '360PerformanceSavings': HandlerKeys.CO_SAVINGS,
    'transaction_download': HandlerKeys.CO_QUICKSILVER,
    'SOFI-Checking': HandlerKeys.SOFI_CHECKING,
    'SOFI-Savings': HandlerKeys.SOFI_SAVINGS,
    'WF-Checking': HandlerKeys.WF_CHECKING,
    'WF-Savings': HandlerKeys.WF_SAVINGS,
    'activity': HandlerKeys.AMEX_DELTA,
    'Chase': HandlerKeys.CHASE,
    'Discover': HandlerKeys.DISCOVER,
}


def detect_account_type(filename: str) -> Optional[str]:
    """
    Attempt to detect the account type from a CSV filename.

    Returns the handler_key string if detected, or None if unrecognized.
    The result is always shown to the user for confirmation before import.
    """
    for substring, handler_key in FILE_DETECTION_MAP.items():
        if substring in filename:
            return handler_key
    return None


# ── Transaction upsert ────────────────────────────────────────────────────────

def upsert_transactions(df: pd.DataFrame, account: Account) -> dict:
    """
    Insert new transactions from a DataFrame, skipping duplicates.
    Labels, category, and additional_labels are never overwritten on re-import.

    Args:
        df:      Cleaned DataFrame from a handler's process() method.
        account: The Account instance transactions belong to.

    Returns:
        dict with keys: inserted, skipped, total.
    """
    if df.empty:
        return {'inserted': 0, 'skipped': 0, 'total': 0}

    # Extract all IDs from the DataFrame
    incoming_ids = df['ID'].tolist()

    # Fetch existing transaction IDs in one query
    existing_ids = set(
        Transaction.objects.filter(id__in=incoming_ids).values_list('id', flat=True)
    )

    # Build list of new transactions to insert
    new_transactions = []
    for row in df.itertuples(index=False):
        if row.ID not in existing_ids:
            new_transactions.append(
                Transaction(
                    id=row.ID,
                    date=row.Date.date() if hasattr(row.Date, 'date') else row.Date,
                    concept=row.Concept,
                    amount=row.Amount,
                    label=None,
                    category=None,
                    additional_labels=None,
                    account=account,
                )
            )

    # Bulk insert new transactions
    if new_transactions:
        Transaction.objects.bulk_create(new_transactions, ignore_conflicts=True)

    inserted = len(new_transactions)
    skipped = len(df) - inserted
    total = len(df)

    logger.info(
        f"Upsert complete for account '{account.name}' — "
        f"inserted: {inserted}, skipped: {skipped}, total: {total}"
    )

    return {'inserted': inserted, 'skipped': skipped, 'total': total}
