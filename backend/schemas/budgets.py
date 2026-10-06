"""
schemas/budgets.py — API schemas for budget and budget-line endpoints.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from ninja import Schema

from schemas.categories import CategoryType

BudgetType = Literal['period', 'project']


class BudgetSchema(Schema):
    """Output schema for a Budget."""

    id: int
    name: str
    type: BudgetType
    period_start: date | None
    period_end: date | None
    is_active: bool
    household_id: int


class BudgetCreateRequest(Schema):
    """Request body for creating a budget.

    period_start/period_end are required for a period budget and must be
    omitted for a project budget — enforced in the endpoint, not here, since
    that check depends on `type`.
    """

    name: str
    type: BudgetType
    household_id: int
    period_start: date | None = None
    period_end: date | None = None


class BudgetRenameRequest(Schema):
    """Request body for renaming a budget.

    Only the name is editable here — type and period dates are set at
    creation and not revisited by this endpoint.
    """

    name: str


class BudgetLineSchema(Schema):
    """Output schema for a BudgetLine.

    category_name/category_type are denormalized from the related Category
    so the frontend doesn't need a second fetch to resolve them.
    planned_amount is a whole-dollar integer — cents aren't meaningful for
    a planning target. actual_amount stays a Decimal, since it's summed
    from Transaction.amount values that do carry cents.

    actual_amount is a cached figure, not computed on this request — it
    only changes via POST /budgets/{id}/recompute-actuals/.
    actual_amount_computed_at is None if that has never been called for
    this line. is_stale tells the client whether a transaction matching
    this line's category has changed since the last recompute (see
    BudgetLine's docstring for what this can't detect: a matching
    transaction being deleted outright).
    """

    id: int
    budget_id: int
    category_id: int
    category_name: str
    category_type: CategoryType
    planned_amount: int
    actual_amount: Decimal
    actual_amount_computed_at: datetime | None
    is_stale: bool
    notes: str


class BudgetLineCreateRequest(Schema):
    """Request schema for adding a category to a budget.

    planned_amount is required — every tracked category needs a projected
    amount from the start; the endpoint rejects a request that omits it
    rather than silently defaulting to zero, so a client has to make that
    choice explicitly (the UI can default its own input to 0). Kept
    Optional here (rather than a plain `int` field) so the endpoint can
    raise its own HttpError(400, ...) for a missing value instead of
    Ninja's generic validation-error response. notes stays optional. Both
    are editable afterward via PATCH /budget-lines/{id}/.
    """

    category_id: int
    planned_amount: int | None = None
    notes: str | None = None


class BudgetLineUpdateRequest(Schema):
    """Request schema for updating a budget line's planned amount or notes.

    At least one field must be provided. category cannot be changed — the
    schema has no such field; remove and re-add the line to change it.
    """

    planned_amount: int | None = None
    notes: str | None = None
