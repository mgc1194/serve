"""
schemas/budgets.py — API schemas for budget and budget-line endpoints.
"""

from datetime import date
from decimal import Decimal
from typing import Literal

from ninja import Schema

from schemas.categories import CategoryType

BudgetType = Literal['spending', 'earning', 'project']


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
    """Request schema for creating a budget."""

    name: str
    type: BudgetType
    household_id: int
    period_start: date | None = None
    period_end: date | None = None


class BudgetUpdateRequest(Schema):
    """Request schema for updating a budget.

    At least one field must be provided. ``type`` is deliberately absent —
    it is immutable after creation, matching Category's convention.
    """

    name: str | None = None
    is_active: bool | None = None
    period_start: date | None = None
    period_end: date | None = None


class BudgetLineSchema(Schema):
    """Output schema for a BudgetLine.

    category_name/category_type are denormalized from the related Category
    so the frontend doesn't need a second fetch to resolve them.
    """

    id: int
    budget_id: int
    category_id: int
    category_name: str
    category_type: CategoryType
    planned_amount: Decimal
    notes: str


class BudgetLineCreateRequest(Schema):
    """Request schema for adding a category to a budget.

    planned_amount/notes are optional — falls back to the model default
    when omitted. Neither is editable via the API yet (no PATCH endpoint);
    that's a later PR's "money goals" feature.
    """

    category_id: int
    planned_amount: Decimal | None = None
    notes: str | None = None
