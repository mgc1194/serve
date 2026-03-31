"""
schemas/summary.py — API schemas for the summary endpoint.
"""

from ninja import Schema


class LabelSummarySchema(Schema):
    """Aggregated total for a single label."""

    label_id: int
    label_name: str
    label_color: str
    category: str  # empty string when uncategorised
    total: float


class CategorySummarySchema(Schema):
    """A category header row with its nested label totals."""

    category: str  # empty string for the "Uncategorised" bucket
    total: float
    labels: list[LabelSummarySchema]


class SummarySchema(Schema):
    """Top-level summary response for a household / month combination.

    earnings                  — labels whose net total is positive (credits)
    spending                  — labels whose net total is negative (debits, stored as negative float)
    total                     — net of all labelled transactions
    balance                   — alias for total (kept for parity with the Detailed view in the UI)
    uncategorised_total       — sum of transactions with no label at all
    earliest_transaction_date — ISO date string of the oldest transaction in the household,
                                or None when no transactions exist. Used by the frontend to
                                constrain the year/month pickers.
    """

    earnings: list[CategorySummarySchema]
    spending: list[CategorySummarySchema]
    total: float
    balance: float
    uncategorised_total: float
    earliest_transaction_date: str | None
