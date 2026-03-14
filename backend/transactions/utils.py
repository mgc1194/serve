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

import pandas as pd

from transactions.constants import HandlerKeys

from .models import Account, Transaction

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


def detect_account_type(filename: str) -> str | None:
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
    Deduplication is scoped to the account via dedupe_hash — preventing
    both accidental duplicates and cross-tenant ID collisions.
    Labels, category, and additional_labels are never overwritten on re-import.

    Args:
        df:      Cleaned DataFrame from a handler's process() method.
        account: The Account instance transactions belong to.

    Returns:
        dict with keys: inserted, skipped, total.
    """
    if df.empty:
        return {'inserted': 0, 'skipped': 0, 'total': 0}

    total = len(df)

    # De-dupe within the incoming batch — banks occasionally export the same row twice
    df = df.drop_duplicates(subset=['dedupe_hash'])

    # Extract all dedupe hashes from the DataFrame
    incoming_hashes = df['dedupe_hash'].tolist()

    # Fetch existing transaction dedupe hashes in one query
    existing_hashes = set(
        Transaction.objects.filter(account=account, dedupe_hash__in=incoming_hashes).values_list(
            'dedupe_hash', flat=True
        )
    )

    # Build list of new transactions to insert
    new_transactions = []
    for row in df.itertuples(index=False):
        if row.dedupe_hash not in existing_hashes:
            new_transactions.append(
                Transaction(
                    dedupe_hash=row.dedupe_hash,
                    raw_data=row.raw_data,
                    date=row.Date.date() if hasattr(row.Date, 'date') else row.Date,
                    concept=row.Concept,
                    amount=row.Amount,
                    label=None,
                    category=None,
                    additional_labels=None,
                    source=Transaction.Source.IMPORT,
                    account=account,
                )
            )

    # Bulk insert new transactions
    if new_transactions:
        Transaction.objects.bulk_create(new_transactions, ignore_conflicts=True)

    inserted = Transaction.objects.filter(
        account=account,
        dedupe_hash__in=[t.dedupe_hash for t in new_transactions],
    ).count()
    skipped = total - inserted

    logger.info(
        f"Upsert complete for account '{account.name}' — "
        f'inserted: {inserted}, skipped: {skipped}, total: {total}'
    )

    return {'inserted': inserted, 'skipped': skipped, 'total': total}
