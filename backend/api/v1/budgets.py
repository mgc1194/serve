"""
api/v1/budgets.py — Budget management endpoints.

Endpoints:
    GET  /api/v1/budgets/ — list a household's active budgets
    POST /api/v1/budgets/ — create a budget in a household

Renaming and deactivating budgets land in follow-up PRs.
"""

import logging

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from budgets.models import Budget
from schemas.budgets import BudgetCreateRequest, BudgetSchema
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
