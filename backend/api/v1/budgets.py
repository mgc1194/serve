"""
api/v1/budgets.py — Budget and BudgetLine management endpoints.

Endpoints:
    GET    /api/v1/budgets/               — list a household's active budgets
    POST   /api/v1/budgets/               — create a budget in a household
    PATCH  /api/v1/budgets/{id}/          — rename a budget
    DELETE /api/v1/budgets/{id}/          — deactivate a budget (soft delete)
    GET    /api/v1/budgets/{id}/lines     — list a budget's lines, with computed actuals
    POST   /api/v1/budgets/{id}/lines     — add a category to a budget
    PATCH  /api/v1/budget-lines/{id}/     — update a line's planned amount or notes
    DELETE /api/v1/budget-lines/{id}/     — remove a category from a budget
"""

import logging
from decimal import Decimal

from django.db import IntegrityError
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from budgets.models import Budget, BudgetLine, Category
from schemas.budgets import (
    BudgetCreateRequest,
    BudgetLineCreateRequest,
    BudgetLineSchema,
    BudgetLineUpdateRequest,
    BudgetRenameRequest,
    BudgetSchema,
)
from transactions.models import Transaction
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Budgets'], auth=django_auth)

NAME_MAX_LENGTH = Budget._meta.get_field('name').max_length


def _get_household_for_member(household_id: int, user) -> Household:
    """Fetches a household and verifies the user is a member.

    Args:
        household_id: Primary key of the household to fetch.
        user: The requesting user.

    Returns:
        The Household instance.

    Raises:
        HttpError: 404 if the household does not exist.
        HttpError: 403 if the user is not a member of the household.
    """
    household = get_object_or_404(Household, pk=household_id)
    if not household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return household


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


def _validate_period(payload: BudgetCreateRequest) -> None:
    """Validates period_start/period_end against the budget's type.

    Args:
        payload: The incoming create request.

    Raises:
        HttpError: 400 if a period budget is missing either date, if a
            project budget has either date set, or if period_start is
            after period_end.
    """
    if payload.type == Budget.Type.PERIOD:
        if not payload.period_start or not payload.period_end:
            raise HttpError(400, 'Period budgets require both period_start and period_end.')
        if payload.period_start > payload.period_end:
            raise HttpError(400, 'period_start must not be after period_end.')
    elif payload.period_start or payload.period_end:
        raise HttpError(400, 'Project budgets cannot have period_start or period_end.')


def _serialize(budget: Budget) -> dict:
    """Serializes a Budget into a dict matching BudgetSchema.

    Args:
        budget: The Budget instance to serialize.

    Returns:
        A dict with the budget's fields.
    """
    return {
        'id': budget.id,
        'name': budget.name,
        'type': budget.type,
        'period_start': budget.period_start,
        'period_end': budget.period_end,
        'is_active': budget.is_active,
        'household_id': budget.household_id,
    }


def _serialize_line(line: BudgetLine, actual_amount: Decimal) -> dict:
    """Serializes a BudgetLine into a dict matching BudgetLineSchema.

    Args:
        line: The BudgetLine instance to serialize.
        actual_amount: The category's computed actual amount, from
            _actuals_for_categories — never read off the model itself.

    Returns:
        A dict with the line's fields plus the given actual_amount.
    """
    return {
        'id': line.id,
        'budget_id': line.budget_id,
        'category_id': line.category_id,
        'category_name': line.category.name,
        'category_type': line.category.type,
        'planned_amount': line.planned_amount,
        'actual_amount': actual_amount,
        'notes': line.notes,
    }


def _actuals_for_categories(budget: Budget, category_ids: list[int]) -> dict[int, Decimal]:
    """Computes each category's "actual" amount for a budget from labeled
    transactions — the sum of Transaction.amount for transactions whose
    label.category is one of category_ids, in the budget's household,
    within the budget's period (or across all time for a project budget,
    which has no period to bound by).

    Returned as positive magnitudes regardless of category type — matches
    how planned_amount is already stored as a positive figure, so an income
    category and an expense category both show a plain dollar amount.

    Args:
        budget: The budget whose period (if any) scopes the transactions.
        category_ids: The category ids to compute actuals for.

    Returns:
        A dict of category_id -> actual amount. A category with no matching
        transactions is simply absent — callers should default to zero.
    """
    if not category_ids:
        return {}

    qs = Transaction.objects.filter(
        account__household_id=budget.household_id,
        exclude_from_summary=False,
        label__category_id__in=category_ids,
    )
    if budget.period_start is not None and budget.period_end is not None:
        qs = qs.filter(date__gte=budget.period_start, date__lte=budget.period_end)

    rows = qs.values('label__category_id').annotate(total=Sum('amount'))
    return {row['label__category_id']: abs(row['total']) for row in rows}


@router.get('/budgets/', response=list[BudgetSchema])
def list_budgets(request, household_id: int):
    """Lists a household's active budgets.

    Deactivated budgets are never returned here — once deactivating a
    budget is possible, they'll stay queryable for historical reporting,
    just not in this default list.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: The household whose budgets to list.

    Returns:
        A list of BudgetSchema, ordered per Budget.Meta.ordering.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the household does not exist.
    """
    household = _get_household_for_member(household_id, request.user)
    budgets = Budget.objects.filter(household=household, is_active=True)
    return [_serialize(b) for b in budgets]


@router.post('/budgets/', response=BudgetSchema)
def create_budget(request, payload: BudgetCreateRequest):
    """Creates a new budget in a household.

    The user must be a member of the target household. Budget names must
    be unique within a household, regardless of type.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: BudgetCreateRequest with name, type, household_id, and
            (for a period budget) period_start/period_end.

    Returns:
        The created BudgetSchema.

    Raises:
        HttpError: 400 if the name is blank, exceeds the model's max
            length, already exists in the household, or if the period
            dates are invalid for the given type.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the household does not exist.
    """
    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Budget name cannot be blank.')
    if len(name) > NAME_MAX_LENGTH:
        raise HttpError(400, f'Budget name cannot exceed {NAME_MAX_LENGTH} characters.')

    household = _get_household_for_member(payload.household_id, request.user)
    _validate_period(payload)

    try:
        budget = Budget.objects.create(
            name=name,
            type=payload.type,
            period_start=payload.period_start,
            period_end=payload.period_end,
            household=household,
        )
    except IntegrityError:
        raise HttpError(400, f'A budget named "{name}" already exists in this household.') from None

    logger.info(
        f'User {request.user.email} created budget "{budget.name}" (id={budget.id}) '
        f'in household "{household.name}" (id={household.id}).'
    )

    return _serialize(budget)


@router.patch('/budgets/{budget_id}/', response=BudgetSchema)
def rename_budget(request, budget_id: int, payload: BudgetRenameRequest):
    """Renames an existing budget.

    The user must be a member of the budget's household. The new name must
    be unique within that household.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget to rename.
        payload: BudgetRenameRequest with the new name.

    Returns:
        The updated BudgetSchema.

    Raises:
        HttpError: 400 if the new name is blank, exceeds the model's max
            length, or another budget in the household already has it.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)

    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Budget name cannot be blank.')
    if len(name) > NAME_MAX_LENGTH:
        raise HttpError(400, f'Budget name cannot exceed {NAME_MAX_LENGTH} characters.')

    try:
        budget.name = name
        budget.save(update_fields=['name', 'updated_at'])
    except IntegrityError:
        raise HttpError(400, f'A budget named "{name}" already exists in this household.') from None

    logger.info(
        f'User {request.user.email} renamed budget (id={budget.id}) to "{name}" '
        f'in household (id={budget.household_id}).'
    )

    return _serialize(budget)


@router.delete('/budgets/{budget_id}/', response={204: None})
def deactivate_budget(request, budget_id: int):
    """Deactivates a budget.

    Soft delete, same rationale as Category: the row is kept (flipping
    is_active to False) rather than removed, so historical reporting can
    still reference it. The user must be a member of the budget's
    household.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget to deactivate.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)

    budget.is_active = False
    budget.save(update_fields=['is_active', 'updated_at'])

    logger.info(
        f'User {request.user.email} deactivated budget "{budget.name}" (id={budget.id}) '
        f'in household (id={budget.household_id}).'
    )


@router.get('/budgets/{budget_id}/lines', response=list[BudgetLineSchema])
def list_budget_lines(request, budget_id: int):
    """Returns the lines (categories tracked) for a budget, each with its
    computed actual_amount.

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
    lines = list(budget.lines.select_related('category'))
    actuals = _actuals_for_categories(budget, [line.category_id for line in lines])
    return [_serialize_line(line, actuals.get(line.category_id, Decimal('0.00'))) for line in lines]


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
    if payload.planned_amount is not None and payload.planned_amount < 0:
        raise HttpError(400, 'planned_amount must not be negative.')

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

    actual = _actuals_for_categories(budget, [category.id]).get(category.id, Decimal('0.00'))
    return _serialize_line(line, actual)


@router.patch('/budget-lines/{line_id}/', response=BudgetLineSchema)
def update_budget_line(request, line_id: int, payload: BudgetLineUpdateRequest):
    """Updates a budget line's planned amount or notes.

    At least one field must be provided. category cannot be changed — the
    schema has no such field; remove and re-add the line to change it.

    Args:
        request: The HTTP request object. Must be authenticated.
        line_id: Primary key of the budget line to update.
        payload: BudgetLineUpdateRequest with at least one of
            planned_amount, notes.

    Returns:
        The updated BudgetLineSchema.

    Raises:
        HttpError: 400 if no fields are provided, or if planned_amount is negative.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the line does not exist.
    """
    line = _get_line_for_member(line_id, request.user)

    update_fields = []

    if payload.planned_amount is not None:
        if payload.planned_amount < 0:
            raise HttpError(400, 'planned_amount must not be negative.')
        line.planned_amount = payload.planned_amount
        update_fields.append('planned_amount')

    if payload.notes is not None:
        line.notes = payload.notes
        update_fields.append('notes')

    if not update_fields:
        raise HttpError(400, 'At least one field must be provided.')

    line.save(update_fields=[*update_fields, 'updated_at'])

    logger.info(f'User {request.user.email} updated budget line (id={line.id}).')

    actual = _actuals_for_categories(line.budget, [line.category_id]).get(
        line.category_id, Decimal('0.00')
    )
    return _serialize_line(line, actual)


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
