"""
schemas/summary.py — API schemas for the summary endpoint.
"""

from ninja import Schema


class LabelSummarySchema(Schema):
    """Aggregated total for a single label."""

    label_id: int
    label_name: str
    label_color: str
    category_id: int | None
    category_name: str  # empty string when uncategorised
    total: float


class CategorySummarySchema(Schema):
    """A category header row with its nested label totals."""

    category_id: int | None
    category_name: str  # empty string for the "Uncategorised" bucket
    total: float
    labels: list[LabelSummarySchema]


class SummarySchema(Schema):
    """Top-level summary response for a household / month combination.

    earnings                  — labels whose assigned category is type EARNING. A label with no
                                category instead falls back to the sign of its own net total
                                (positive -> earnings), since there's no category type to defer
                                to. Because the split follows category type rather than sign, a
                                categorized label's total here can be negative (e.g. a clawback
                                under an earning category) — this is not a labelled/display bug.
    spending                  — labels whose assigned category is type SPENDING, with the same
                                sign-based fallback for uncategorized labels (negative -> spending).
                                A categorized label's total here can likewise be positive (e.g. a
                                refund or deposit filed under a spending category).
    total                     — net of all transactions in the summary (labelled + uncategorised_total)
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
