"""
api/v1/budgets.py — Budget and BudgetLine management endpoints.

Endpoints:
    GET    /api/v1/budgets/               — list budgets for the user's households
    POST   /api/v1/budgets/               — create (or reactivate) a budget in a household
    PATCH  /api/v1/budgets/{id}/          — update a budget's name, active state, or period
    DELETE /api/v1/budgets/{id}/          — soft-delete a budget (is_active=False)
    GET    /api/v1/budgets/{id}/lines     — list a budget's lines
    POST   /api/v1/budgets/{id}/lines     — add a category to a budget
    DELETE /api/v1/budget-lines/{id}/     — remove a category from a budget

Editing a line's planned_amount/notes has no endpoint yet — that's the
"money goals" feature, a later PR.
"""

import logging
from decimal import Decimal

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from budgets.models import Budget, BudgetLine, Category
from schemas.budgets import (
    BudgetCreateRequest,
    BudgetLineCreateRequest,
    BudgetLineSchema,
    BudgetSchema,
    BudgetUpdateRequest,
)
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Budgets'], auth=django_auth)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_budget_for_member(budget_id: int, user) -> Budget:
    """Fetches a budget and verifies the user is a member of its household.

    Args:
        budget_id: Primary key of the budget to fetch.
        user: The requesting user.

    Returns:
        The Budget instance.

    Raises:
        HttpError: 404 if the budget does not exist.
        HttpError: 403 if the user is not a member of the budget's household.
    """
    budget = get_object_or_404(Budget.objects.select_related('household'), pk=budget_id)
    if not budget.household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return budget


def _get_line_for_member(line_id: int, user) -> BudgetLine:
    """Fetches a budget line and verifies the user is a member of its household.

    Args:
        line_id: Primary key of the budget line to fetch.
        user: The requesting user.

    Returns:
        The BudgetLine instance.

    Raises:
        HttpError: 404 if the line does not exist.
        HttpError: 403 if the user is not a member of the line's household.
    """
    line = get_object_or_404(
        BudgetLine.objects.select_related('budget__household', 'category'), pk=line_id
    )
    if not line.budget.household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return line


def _serialize(budget: Budget) -> dict:
    """Serializes a Budget into a dict matching BudgetSchema."""
    return {
        'id': budget.id,
        'name': budget.name,
        'type': budget.type,
        'period_start': budget.period_start,
        'period_end': budget.period_end,
        'is_active': budget.is_active,
        'household_id': budget.household_id,
    }


def _serialize_line(line: BudgetLine) -> dict:
    """Serializes a BudgetLine into a dict matching BudgetLineSchema."""
    return {
        'id': line.id,
        'budget_id': line.budget_id,
        'category_id': line.category_id,
        'category_name': line.category.name,
        'category_type': line.category.type,
        'planned_amount': line.planned_amount,
        'notes': line.notes,
    }


def _validate_period(budget_type: str, period_start, period_end) -> None:
    """Validates period_start/period_end against a budget's type.

    Raises:
        HttpError: 400 if a project budget has either date set.
        HttpError: 400 if a spending/earning budget is missing either date.
        HttpError: 400 if period_start is after period_end.
    """
    if budget_type == Budget.Type.PROJECT:
        if period_start is not None or period_end is not None:
            raise HttpError(400, 'Project budgets cannot have a period_start or period_end.')
        return

    if period_start is None or period_end is None:
        raise HttpError(
            400, "'period_start' and 'period_end' are required for spending/earning budgets."
        )
    if period_start > period_end:
        raise HttpError(400, "'period_start' must not be after 'period_end'.")


# ── GET /budgets/ ────────────────────────────────────────────────────────────


@router.get('/budgets/', response=list[BudgetSchema])
def list_budgets(request, household_id: int | None = None, include_inactive: bool = False):
    """Returns budgets for the user's households.

    Scoped to the requesting user — only budgets belonging to households the
    user is a member of are returned. Results can be optionally narrowed to
    a single household via household_id. Defaults to active-only.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Optional. Filter results to a single household.
        include_inactive: If True, also include soft-deleted budgets.

    Returns:
        A list of BudgetSchema, newest first.

    Raises:
        HttpError: 403 if household_id is provided but the user is not a member.
        HttpError: 404 if household_id is provided but does not exist.
    """
    if household_id is not None:
        household = get_object_or_404(Household, pk=household_id)
        if not household.users.filter(pk=request.user.pk).exists():
            raise HttpError(403, 'You are not a member of this household.')

    qs = Budget.objects.filter(household__users=request.user)

    if household_id is not None:
        qs = qs.filter(household_id=household_id)

    if not include_inactive:
        qs = qs.filter(is_active=True)

    return [_serialize(budget) for budget in qs]


# ── POST /budgets/ ───────────────────────────────────────────────────────────


@router.post('/budgets/', response=BudgetSchema)
def create_budget(request, payload: BudgetCreateRequest):
    """Creates a new budget in a household, reactivating a soft-deleted one.

    The user must be a member of the target household. If a soft-deleted
    budget already exists at (household, name, type), it is reactivated
    instead of creating a duplicate row, matching Category's convention —
    its period dates are updated to the newly provided ones.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: BudgetCreateRequest with name, type, household_id, and
            (depending on type) period_start/period_end.

    Returns:
        The created (or reactivated) BudgetSchema.

    Raises:
        HttpError: 400 if the name is blank.
        HttpError: 400 if the period dates don't match the budget's type.
        HttpError: 400 if an active budget with that (name, type) already exists.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the household does not exist.
    """
    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Budget name cannot be blank.')

    _validate_period(payload.type, payload.period_start, payload.period_end)

    household = get_object_or_404(Household, pk=payload.household_id)
    if not household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    existing = Budget.objects.filter(household=household, name=name, type=payload.type).first()
    if existing is not None:
        if existing.is_active:
            raise HttpError(400, f'A budget named "{name}" already exists in this household.')
        existing.is_active = True
        existing.period_start = payload.period_start
        existing.period_end = payload.period_end
        existing.save(update_fields=['is_active', 'period_start', 'period_end', 'updated_at'])
        logger.info(
            f'User {request.user.email} reactivated budget "{existing.name}" '
            f'(id={existing.id}) in household "{household.name}" (id={household.id}).'
        )
        return _serialize(existing)

    budget = Budget.objects.create(
        name=name,
        type=payload.type,
        period_start=payload.period_start,
        period_end=payload.period_end,
        household=household,
    )

    logger.info(
        f'User {request.user.email} created budget "{budget.name}" '
        f'(id={budget.id}) in household "{household.name}" (id={household.id}).'
    )

    return _serialize(budget)


# ── PATCH /budgets/{id}/ ─────────────────────────────────────────────────────


@router.patch('/budgets/{budget_id}/', response=BudgetSchema)
def update_budget(request, budget_id: int, payload: BudgetUpdateRequest):
    """Updates a budget's name, active state, or period dates.

    At least one field must be provided. Only modified fields are written to
    the database via ``update_fields``. ``type`` cannot be changed — the
    schema has no such field; delete and recreate to change it. Updated
    period dates are re-validated against the budget's (unchanged) type.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget to update.
        payload: BudgetUpdateRequest with at least one of name, is_active,
            period_start, period_end.

    Returns:
        The updated BudgetSchema.

    Raises:
        HttpError: 400 if no fields are provided.
        HttpError: 400 if the new name is blank.
        HttpError: 400 if the resulting period dates don't match the budget's type.
        HttpError: 400 if another budget in the household already has that (name, type).
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)

    update_fields = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HttpError(400, 'Budget name cannot be blank.')
        budget.name = name
        update_fields.append('name')

    if payload.is_active is not None:
        budget.is_active = payload.is_active
        update_fields.append('is_active')

    if 'period_start' in payload.model_fields_set:
        budget.period_start = payload.period_start
        update_fields.append('period_start')

    if 'period_end' in payload.model_fields_set:
        budget.period_end = payload.period_end
        update_fields.append('period_end')

    if not update_fields:
        raise HttpError(400, 'At least one field must be provided.')

    if 'period_start' in payload.model_fields_set or 'period_end' in payload.model_fields_set:
        _validate_period(budget.type, budget.period_start, budget.period_end)

    try:
        budget.save(update_fields=[*update_fields, 'updated_at'])
    except IntegrityError:
        raise HttpError(
            400, f'A budget named "{budget.name}" already exists in this household.'
        ) from None

    logger.info(
        f'User {request.user.email} updated budget (id={budget.id}) '
        f'in household (id={budget.household_id}).'
    )

    return _serialize(budget)


# ── DELETE /budgets/{id}/ ────────────────────────────────────────────────────


@router.delete('/budgets/{budget_id}/', response={204: None})
def delete_budget(request, budget_id: int):
    """Soft-deletes a budget by setting is_active to False.

    Its lines are left untouched — they simply become unreachable through
    the active-budgets list until the budget is reactivated.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget to soft-delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)
    budget.is_active = False
    budget.save(update_fields=['is_active', 'updated_at'])

    logger.info(f'User {request.user.email} deactivated budget (id={budget_id}).')

    return None


# ── GET /budgets/{id}/lines ──────────────────────────────────────────────────


@router.get('/budgets/{budget_id}/lines', response=list[BudgetLineSchema])
def list_budget_lines(request, budget_id: int):
    """Returns the lines (categories tracked) for a budget.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget.

    Returns:
        A list of BudgetLineSchema, ordered by category type then name.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)
    lines = budget.lines.select_related('category')
    return [_serialize_line(line) for line in lines]


# ── POST /budgets/{id}/lines ─────────────────────────────────────────────────


@router.post('/budgets/{budget_id}/lines', response=BudgetLineSchema)
def create_budget_line(request, budget_id: int, payload: BudgetLineCreateRequest):
    """Adds a category to a budget.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget.
        payload: BudgetLineCreateRequest with category_id and optionally
            planned_amount/notes.

    Returns:
        The created BudgetLineSchema.

    Raises:
        HttpError: 400 if the category belongs to a different household than the budget.
        HttpError: 400 if this category already has a line on this budget.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget or category does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)
    category = get_object_or_404(Category, pk=payload.category_id)
    if category.household_id != budget.household_id:
        raise HttpError(400, 'Category does not belong to the same household as this budget.')

    try:
        line = BudgetLine.objects.create(
            budget=budget,
            category=category,
            planned_amount=payload.planned_amount
            if payload.planned_amount is not None
            else Decimal('0.00'),
            notes=payload.notes or '',
        )
    except IntegrityError:
        raise HttpError(400, f'"{category.name}" is already part of this budget.') from None

    logger.info(
        f'User {request.user.email} added category "{category.name}" (id={category.id}) '
        f'to budget "{budget.name}" (id={budget.id}).'
    )

    return _serialize_line(line)


# ── DELETE /budget-lines/{id}/ ───────────────────────────────────────────────


@router.delete('/budget-lines/{line_id}/', response={204: None})
def delete_budget_line(request, line_id: int):
    """Removes a category from a budget. Hard delete — a line has no
    downstream references the way a Category does.

    Args:
        request: The HTTP request object. Must be authenticated.
        line_id: Primary key of the budget line to delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the line does not exist.
    """
    line = _get_line_for_member(line_id, request.user)
    line.delete()

    logger.info(f'User {request.user.email} removed budget line (id={line_id}).')

    return None
