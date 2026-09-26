"""
schemas/budgets.py — API schemas for budget endpoints.
"""

from datetime import date
from typing import Literal

from ninja import Schema

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
