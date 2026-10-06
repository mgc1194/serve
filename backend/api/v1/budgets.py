"""
api/v1/budgets.py — Budget and BudgetLine management endpoints.

Endpoints:
    GET    /api/v1/budgets/                        — list a household's active budgets
    POST   /api/v1/budgets/                        — create a budget in a household
    PATCH  /api/v1/budgets/{id}/                   — rename a budget
    DELETE /api/v1/budgets/{id}/                   — deactivate a budget (soft delete)
    GET    /api/v1/budgets/{id}/lines              — list a budget's lines, with cached actuals
    POST   /api/v1/budgets/{id}/lines              — add a category to a budget
    POST   /api/v1/budgets/{id}/recompute-actuals/ — refresh every line's cached actual_amount
    PATCH  /api/v1/budget-lines/{id}/              — update a line's planned amount or notes
    DELETE /api/v1/budget-lines/{id}/              — remove a category from a budget
"""

import logging
from datetime import datetime
from decimal import Decimal

from django.db import IntegrityError
from django.db.models import Max, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
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
    RecomputeActualsResponse,
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


def _serialize(budget: Budget, is_stale: bool) -> dict:
    """Serializes a Budget into a dict matching BudgetSchema.

    Args:
        budget: The Budget instance to serialize.
        is_stale: Result of _is_stale for this budget.

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
        'synced_at': budget.synced_at,
        'is_stale': is_stale,
    }


def _serialize_line(line: BudgetLine) -> dict:
    """Serializes a BudgetLine into a dict matching BudgetLineSchema.

    Args:
        line: The BudgetLine instance to serialize. actual_amount is read
            straight off the model — it's a cache, not computed for this
            request.

    Returns:
        A dict with the line's fields.
    """
    return {
        'id': line.id,
        'budget_id': line.budget_id,
        'category_id': line.category_id,
        'category_name': line.category.name,
        'category_type': line.category.type,
        'planned_amount': line.planned_amount,
        'actual_amount': line.actual_amount,
        'notes': line.notes,
    }


def _transaction_scope(budget: Budget, category_ids: list[int]):
    """Base queryset for the transactions that make up actual_amount for
    the given categories: labeled transactions in the budget's household,
    scoped to the budget's period for a period budget, or unbounded for a
    project budget. Shared by _actuals_for_categories (sums amounts) and
    _latest_transaction_update (finds the newest updated_at) so both stay
    scoped identically.

    Args:
        budget: The budget whose period (if any) scopes the transactions.
        category_ids: The category ids to scope to.

    Returns:
        An unevaluated Transaction queryset, or an empty one if
        category_ids is empty.
    """
    if not category_ids:
        return Transaction.objects.none()

    qs = Transaction.objects.filter(
        account__household_id=budget.household_id,
        exclude_from_summary=False,
        label__category_id__in=category_ids,
    )
    if budget.period_start is not None and budget.period_end is not None:
        qs = qs.filter(date__gte=budget.period_start, date__lte=budget.period_end)
    return qs


def _actuals_for_categories(budget: Budget, category_ids: list[int]) -> dict[int, Decimal]:
    """Computes each category's "actual" amount for a budget from labeled
    transactions — the sum of Transaction.amount in _transaction_scope.

    Returned as positive magnitudes regardless of category type — matches
    how planned_amount is already stored as a positive figure, so an income
    category and an expense category both show a plain dollar amount.

    Only called from recompute_budget_actuals — nowhere else computes this
    live; everywhere else reads the cached BudgetLine.actual_amount.

    Args:
        budget: The budget whose period (if any) scopes the transactions.
        category_ids: The category ids to compute actuals for.

    Returns:
        A dict of category_id -> actual amount. A category with no matching
        transactions is simply absent — callers should default to zero.
    """
    rows = (
        _transaction_scope(budget, category_ids)
        .values('label__category_id')
        .annotate(total=Sum('amount'))
    )
    return {row['label__category_id']: abs(row['total']) for row in rows}


def _category_ids_for_budget(budget: Budget) -> list[int]:
    """The category ids tracked by a budget's lines, for staleness checks."""
    return list(budget.lines.values_list('category_id', flat=True))


def _latest_transaction_update(budget: Budget, category_ids: list[int]) -> datetime | None:
    """The most recent updated_at among all transactions matching any of
    the given categories, for a staleness check — same scope as
    _actuals_for_categories, but a single Max('updated_at') across every
    category together rather than grouped per category, since staleness is
    tracked budget-wide now, not per line (see Budget's docstring).

    Args:
        budget: The budget whose period (if any) scopes the transactions.
        category_ids: The category ids to check — typically every category
            this budget's lines track.

    Returns:
        The latest matching updated_at, or None if there are no matching
        transactions at all.
    """
    return _transaction_scope(budget, category_ids).aggregate(latest=Max('updated_at'))['latest']


def _is_stale(budget: Budget, category_ids: list[int], latest_update: datetime | None) -> bool:
    """Whether a budget's cached actual_amounts may no longer reflect its
    matching transactions.

    False outright if the budget has no lines (nothing to go stale about).
    Otherwise true if actuals have never been computed, or a matching
    transaction changed after the last computation. This is a raw signal,
    not dismissable server-side — see Budget's docstring — and cannot
    detect a matching transaction having been deleted outright.

    Args:
        budget: The Budget to check.
        category_ids: Result of _category_ids_for_budget for this budget.
        latest_update: Result of _latest_transaction_update for the same
            category_ids.

    Returns:
        True if the cached actual_amounts may be out of date.
    """
    if not category_ids:
        return False
    if budget.synced_at is None:
        return True
    return latest_update is not None and latest_update > budget.synced_at


def _is_stale_for_budget(budget: Budget) -> bool:
    """_is_stale, computing category_ids/latest_update for a single budget
    itself rather than taking them as arguments — for endpoints that only
    ever handle one budget at a time (everything except list_budgets).

    Args:
        budget: The Budget to check.

    Returns:
        True if the staleness warning should currently show.
    """
    category_ids = _category_ids_for_budget(budget)
    latest_update = _latest_transaction_update(budget, category_ids)
    return _is_stale(budget, category_ids, latest_update)


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
    return [_serialize(b, _is_stale_for_budget(b)) for b in budgets]


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

    # Brand new, no lines yet — nothing to be stale about.
    return _serialize(budget, is_stale=False)


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

    return _serialize(budget, _is_stale_for_budget(budget))


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
    cached actual_amount.

    actual_amount is never computed here — it's whatever
    recompute_budget_actuals last persisted (or 0, uncomputed, for a line
    that's never been refreshed). Whether it's worth calling that endpoint
    is reported on the budget itself (GET /budgets/), not per line here.

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
    return [_serialize_line(line) for line in lines]


@router.post('/budgets/{budget_id}/lines', response=BudgetLineSchema)
def create_budget_line(request, budget_id: int, payload: BudgetLineCreateRequest):
    """Adds a category to a budget.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget.
        payload: BudgetLineCreateRequest with category_id, planned_amount,
            and optionally notes.

    Returns:
        The created BudgetLineSchema.

    Raises:
        HttpError: 400 if the category belongs to a different household than the budget.
        HttpError: 400 if planned_amount is missing or negative.
        HttpError: 400 if this category already has a line on this budget.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget or category does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)
    category = get_object_or_404(Category, pk=payload.category_id)
    if category.household_id != budget.household_id:
        raise HttpError(400, 'Category does not belong to the same household as this budget.')
    if payload.planned_amount is None:
        raise HttpError(400, 'planned_amount is required.')
    if payload.planned_amount < 0:
        raise HttpError(400, 'planned_amount must not be negative.')

    try:
        line = BudgetLine.objects.create(
            budget=budget,
            category=category,
            planned_amount=payload.planned_amount,
            notes=payload.notes or '',
        )
    except IntegrityError:
        raise HttpError(400, f'"{category.name}" is already part of this budget.') from None

    logger.info(
        f'User {request.user.email} added category "{category.name}" (id={category.id}) '
        f'to budget "{budget.name}" (id={budget.id}).'
    )

    return _serialize_line(line)


@router.post('/budgets/{budget_id}/recompute-actuals/', response=RecomputeActualsResponse)
def recompute_budget_actuals(request, budget_id: int):
    """Refreshes actual_amount for every line in a budget from labeled
    transactions, and persists the result.

    This is the only endpoint that ever changes actual_amount — it is a
    cache, refreshed solely on request, not as a side effect of listing,
    creating, or updating a line. No request body: it always recomputes
    every line in the budget, not a subset. Also bumps the budget's own
    synced_at to now.

    Args:
        request: The HTTP request object. Must be authenticated.
        budget_id: Primary key of the budget whose lines to recompute.

    Returns:
        A RecomputeActualsResponse: the budget (is_stale now False) and
        its freshly computed lines, ordered by category type then name.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the budget does not exist.
    """
    budget = _get_budget_for_member(budget_id, request.user)
    lines = list(budget.lines.select_related('category'))
    actuals = _actuals_for_categories(budget, [line.category_id for line in lines])

    now = timezone.now()
    for line in lines:
        line.actual_amount = actuals.get(line.category_id, Decimal('0.00'))
        line.updated_at = now
    BudgetLine.objects.bulk_update(lines, ['actual_amount', 'updated_at'])

    budget.synced_at = now
    budget.save(update_fields=['synced_at', 'updated_at'])

    logger.info(
        f'User {request.user.email} recomputed actuals for budget "{budget.name}" (id={budget.id}).'
    )

    return {
        'budget': _serialize(budget, is_stale=False),
        'lines': [_serialize_line(line) for line in lines],
    }


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

    # planned_amount/notes never touch actual_amount — only recompute_budget_actuals does.
    return _serialize_line(line)


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
