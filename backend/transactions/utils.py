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
    inserted = 0
    skipped  = 0

    for _, row in df.iterrows():
        _, created = Transaction.objects.get_or_create(
            id=row['ID'],
            defaults={
                'date':              row['Date'].date() if hasattr(row['Date'], 'date') else row['Date'],
                'concept':           row['Concept'],
                'amount':            row['Amount'],
                'label':             None,
                'category':          None,
                'additional_labels': None,
                'account':           account,
            }
        )
        if created:
            inserted += 1
        else:
            skipped += 1

    logger.info(
        f"Upsert complete for account '{account.name}' — "
        f"inserted: {inserted}, skipped: {skipped}, total: {inserted + skipped}"
    )

    return {'inserted': inserted, 'skipped': skipped, 'total': inserted + skipped}