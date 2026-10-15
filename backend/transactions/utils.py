"""
backend/transactions/utils.py — Transaction persistence utilities.

This module contains non-model business logic for creating Transaction
rows during import. It is the transactions app's responsibility because
the function only creates and queries Transaction objects — Account is
accepted purely as a parameter identifying which account the rows belong
to (banking.Account is referenced via a normal cross-app import, the same
way Transaction.account already FKs into banking).

Account-detection logic (mapping a filename to a handler_key) remains in
banking/utils.py — that is a banking concern, not a transaction concern.

This module intentionally does not contain CSV parsing or normalization
logic; that is handled by account handlers in banking.handlers, while
referential integrity is enforced at the model layer.
"""

import logging

import pandas as pd

from banking.models import Account
from transactions.models import Transaction

logger = logging.getLogger(__name__)


# ── Transaction upsert ────────────────────────────────────────────────────────


def upsert_transactions(df: pd.DataFrame, account: Account) -> dict:
    """
    Insert new transactions from a DataFrame, skipping duplicates.
    Deduplication is scoped to the account via dedupe_hash — preventing
    both accidental duplicates and cross-tenant ID collisions.
    Labels and additional_labels are never overwritten on re-import.

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
