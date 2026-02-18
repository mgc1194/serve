"""
transactions/utils.py — Business logic for transaction processing.
"""

import logging
from typing import Optional

import pandas as pd

from .models import Account, Transaction

logger = logging.getLogger(__name__)


# ── Account detection ─────────────────────────────────────────────────────────

# Maps filename substrings to handler_key values in ACCOUNT_HANDLERS.
# Order matters — more specific patterns should come first.
FILE_DETECTION_MAP = {
    '360Checking':           'CO Checking',
    '360PerformanceSavings': 'CO Savings',
    'transaction_download':  'Quicksilver',
    'SOFI-Checking':         'SoFi Checking',
    'SOFI-Savings':          'SoFi Savings',
    'WF-Checking':           'WF Checking',
    'WF-Savings':            'WF Savings',
    'activity':              'Delta',
    'Chase':                 'Chase',
    'Discover':              'Discover',
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
