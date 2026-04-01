"""
api/v1/summary.py — Transaction summary endpoint.

Endpoints:
    GET /api/v1/summary/ — returns transactions aggregated by label (and
                           category if assigned) for a given household and
                           optional month.

Query parameters:
    household_id (int, required)  — household to summarise
    month        (str, optional)  — ISO month string "YYYY-MM"; when omitted
                                    all-time totals are returned.
"""

import logging
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from django.db.models import Min, Sum
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from schemas.summary import CategorySummarySchema, LabelSummarySchema, SummarySchema
from transactions.models import Transaction
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Summary'], auth=django_auth)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_category_rows(
    label_rows: list[LabelSummarySchema],
) -> list[CategorySummarySchema]:
    """Groups LabelSummarySchema rows into CategorySummarySchema rows.

    Labels without a category land in a bucket with category=''.
    Categories are sorted alphabetically; uncategorised lands last.
    Within each category labels are sorted alphabetically by name.
    """
    buckets: dict[str, list[LabelSummarySchema]] = defaultdict(list)
    for row in label_rows:
        buckets[row.category].append(row)

    result: list[CategorySummarySchema] = []
    # Sort: named categories first (alphabetically), then uncategorised
    for category in sorted(buckets, key=lambda c: (c == '', c)):
        labels = sorted(buckets[category], key=lambda r: r.label_name)
        total = sum(r.total for r in labels)
        result.append(
            CategorySummarySchema(
                category=category,
                total=float(total),
                labels=labels,
            )
        )
    return result


# ── GET /summary/ ─────────────────────────────────────────────────────────────


@router.get('/summary/', response=SummarySchema)
def get_summary(
    request,
    household_id: int,
    month: str | None = None,
):
    """Returns transactions aggregated by label for a household.

    Transactions are split into earnings (positive net) and spending (negative
    net) sections, each grouped by the label's category.  Labels with no
    category appear at the bottom of their section under an empty-string key.
    Transactions that have no label at all are counted separately in
    ``uncategorised_total`` and are not included in either section.

    The response always includes ``earliest_transaction_date`` — the ISO date
    of the oldest transaction in the household (regardless of the month filter),
    or None when no transactions exist.  The frontend uses this to bound the
    year/month pickers so users cannot select periods with no data.

    Args:
        request:      The HTTP request object. Must be authenticated.
        household_id: The household whose transactions to summarise.
        month:        Optional ISO month string "YYYY-MM".  When provided only
                      transactions whose ``date`` falls within that calendar
                      month are included.

    Returns:
        SummarySchema with earnings, spending, total, balance,
        uncategorised_total, and earliest_transaction_date.

    Raises:
        HttpError: 400 if ``month`` is provided but is not a valid "YYYY-MM"
                   string.
        HttpError: 403 if the requesting user is not a member of the household.
        HttpError: 404 if the household does not exist.
    """
    household = get_object_or_404(Household, pk=household_id)
    if not household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    # ── Parse month filter ────────────────────────────────────────────────────
    year: int | None = None
    month_num: int | None = None

    if month is not None:
        try:
            parsed = datetime.strptime(month, '%Y-%m')
            year, month_num = parsed.year, parsed.month
        except ValueError:
            raise HttpError(400, 'month must be a valid "YYYY-MM" string.') from None

    # ── Earliest transaction date (unfiltered — always household-wide) ────────
    all_qs = Transaction.objects.filter(account__household_id=household_id)
    earliest_agg = all_qs.aggregate(earliest=Min('date'))
    earliest_date = earliest_agg['earliest']
    earliest_transaction_date = earliest_date.isoformat() if earliest_date else None

    # ── Base queryset scoped to household (+ optional month filter) ───────────
    base_qs = all_qs.filter(exclude_from_summary=False)
    if year is not None and month_num is not None:
        base_qs = base_qs.filter(date__year=year, date__month=month_num)

    # ── Uncategorised total (no label) ────────────────────────────────────────
    uncategorised_agg = base_qs.filter(label__isnull=True).aggregate(total=Sum('amount'))
    uncategorised_total = float(uncategorised_agg['total'] or Decimal('0'))

    # ── Labelled aggregation ──────────────────────────────────────────────────
    # Group by label — pull id, name, color, category in one query.
    labelled_qs = (
        base_qs.filter(label__isnull=False)
        .values(
            'label__id',
            'label__name',
            'label__color',
            'label__category',
        )
        .annotate(total=Sum('amount'))
    )

    earnings_labels: list[LabelSummarySchema] = []
    spending_labels: list[LabelSummarySchema] = []

    for row in labelled_qs:
        total_val = float(row['total'] or Decimal('0'))
        label_row = LabelSummarySchema(
            label_id=row['label__id'],
            label_name=row['label__name'],
            label_color=row['label__color'],
            category=row['label__category'] or '',
            total=total_val,
        )
        if total_val >= 0:
            earnings_labels.append(label_row)
        else:
            spending_labels.append(label_row)

    earnings_categories = _build_category_rows(earnings_labels)
    spending_categories = _build_category_rows(spending_labels)

    all_labelled_total = sum(r.total for r in earnings_labels + spending_labels)
    net_total = all_labelled_total + uncategorised_total

    logger.debug(
        'Summary for household %s month=%s: earnings=%d labels, spending=%d labels',
        household_id,
        month,
        len(earnings_labels),
        len(spending_labels),
    )

    return SummarySchema(
        earnings=earnings_categories,
        spending=spending_categories,
        total=float(net_total),
        balance=float(net_total),
        uncategorised_total=uncategorised_total,
        earliest_transaction_date=earliest_transaction_date,
    )
