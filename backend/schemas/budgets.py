"""
schemas/budgets.py — API schemas for budget and budget-line endpoints.
"""

from datetime import date
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
    actual_amount is computed at read time from labeled transactions (see
    api/v1/budgets.py::_actuals_for_categories) — never stored.
    """

    id: int
    budget_id: int
    category_id: int
    category_name: str
    category_type: CategoryType
    planned_amount: Decimal
    actual_amount: Decimal
    notes: str


class BudgetLineCreateRequest(Schema):
    """Request schema for adding a category to a budget.

    planned_amount/notes are optional — falls back to the model default
    when omitted. Both are editable afterward via PATCH /budget-lines/{id}/.
    """

    category_id: int
    planned_amount: Decimal | None = None
    notes: str | None = None


class BudgetLineUpdateRequest(Schema):
    """Request schema for updating a budget line's planned amount or notes.

    At least one field must be provided. category cannot be changed — the
    schema has no such field; remove and re-add the line to change it.
    """

    planned_amount: Decimal | None = None
    notes: str | None = None
