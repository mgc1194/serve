"""
api/v1/accounts.py — Account management endpoints.

Endpoints:
    GET    /api/v1/accounts/         — list accounts across the user's households
    POST   /api/v1/accounts/         — create an account in a household
    PATCH  /api/v1/accounts/{id}/    — rename an account
    DELETE /api/v1/accounts/{id}/    — delete an account
"""

import logging
from enum import Enum, StrEnum

from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from schemas.accounts import AccountCreateRequest, AccountDetailSchema, AccountRenameRequest
from transactions.models import Account, AccountType
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Accounts'], auth=django_auth)


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


class SortField(StrEnum, Enum):
    bank = 'bank'
    name = 'name'
    household = 'household'
    created_at = 'created_at'


_SORT_MAP = {
    SortField.bank: ('account_type__bank__name', 'name'),
    SortField.name: ('name',),
    SortField.household: ('household__name', 'account_type__bank__name', 'name'),
    SortField.created_at: ('-created_at',),
}


@router.get('/accounts/', response=list[AccountDetailSchema])
def list_accounts(
    request,
    household_id: int | None = None,
    bank_id: int | None = None,
    sort: SortField = SortField.bank,
):
    """Lists accounts across all of the user's households.

    Scoped to the requesting user — only accounts belonging to households
    the user is a member of are returned. Results can be optionally narrowed
    by household or bank, and ordered by bank, name, household, or creation date.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Optional. Filter results to a single household.
        bank_id: Optional. Filter results to accounts at a specific bank.
        sort: Sort order. One of: bank (default), name, household, created_at.
            created_at sorts descending (newest first); all others ascending.

    Returns:
        A list of AccountDetailSchema objects.

    Raises:
        HttpError: 403 if household_id is provided but the user is not a member.
        HttpError: 404 if household_id is provided but does not exist.
    """
    if household_id is not None:
        _get_household_for_member(household_id, request.user)

    qs = (
        Account.objects
        .filter(household__users=request.user)
        .select_related('account_type__bank', 'household')
    )

    if household_id is not None:
        qs = qs.filter(household_id=household_id)

    if bank_id is not None:
        qs = qs.filter(account_type__bank_id=bank_id)

    qs = qs.order_by(*_SORT_MAP[sort])

    return [_serialize(acc) for acc in qs]


@router.post('/accounts/', response=AccountDetailSchema)
def create_account(request, payload: AccountCreateRequest):
    """Creates a new account in a household.

    The user must be a member of the target household. The account_type_id
    must refer to a seeded AccountType. Account names must be unique within
    a household.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: AccountCreateRequest with household_id, account_type_id,
            and name.

    Returns:
        The created AccountDetailSchema.

    Raises:
        HttpError: 400 if the name is blank.
        HttpError: 400 if an account with that name already exists in the household.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the household or account type does not exist.
    """
    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Account name cannot be blank.')

    household = _get_household_for_member(payload.household_id, request.user)
    account_type = get_object_or_404(
        AccountType.objects.select_related('bank'),
        pk=payload.account_type_id,
    )

    try:
        account = Account.objects.create(
            name=name,
            account_type=account_type,
            household=household,
        )
    except IntegrityError:
        raise HttpError(400, f'An account named "{name}" already exists in this household.') from None

    logger.info(
        f'User {request.user.email} created account '
        f'"{account.name}" (id={account.id}) in household "{household.name}" (id={household.id}).'
    )

    # Attach the already-fetched relations so _serialize has no extra queries.
    account.account_type = account_type
    account.household = household
    return _serialize(account)


@router.patch('/accounts/{account_id}/', response=AccountDetailSchema)
def rename_account(request, account_id: int, payload: AccountRenameRequest):
    """Renames an existing account.

    The user must be a member of the household the account belongs to.
    The new name must be unique within that household.

    Args:
        request: The HTTP request object. Must be authenticated.
        account_id: Primary key of the account to rename.
        payload: AccountRenameRequest with the new name.

    Returns:
        The updated AccountDetailSchema.

    Raises:
        HttpError: 400 if the new name is blank.
        HttpError: 400 if another account in the household already has that name.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the account does not exist.
    """
    account = get_object_or_404(
        Account.objects.select_related('account_type__bank', 'household'),
        pk=account_id,
    )

    _get_household_for_member(account.household_id, request.user)

    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Account name cannot be blank.')

    try:
        account.name = name
        account.save(update_fields=['name', 'updated_at'])
    except IntegrityError:
        raise HttpError(400, f'An account named "{name}" already exists in this household.') from None

    logger.info(
        f'User {request.user.email} renamed account '
        f'(id={account.id}) to "{name}" in household (id={account.household_id}).'
    )

    return _serialize(account)


@router.delete('/accounts/{account_id}/', response={204: None})
def delete_account(request, account_id: int):
    """Deletes an account.

    The user must be a member of the household the account belongs to.
    Accounts with existing transactions cannot be deleted (PROTECT constraint).

    Args:
        request: The HTTP request object. Must be authenticated.
        account_id: Primary key of the account to delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the account does not exist.
        HttpError: 409 if the account has transactions and cannot be deleted.
    """
    account = get_object_or_404(
        Account.objects.select_related('account_type__bank', 'household'),
        pk=account_id,
    )

    _get_household_for_member(account.household_id, request.user)

    try:
        account.delete()
    except ProtectedError:
        raise HttpError(409, 'This account has transactions and cannot be deleted.') from None

    logger.info(
        f'User {request.user.email} deleted account '
        f'(id={account_id}) from household (id={account.household_id}).'
    )

    return 204, None


def _serialize(account: Account) -> dict:
    """Serializes an Account into a dict matching AccountDetailSchema."""
    return {
        'id': account.id,
        'name': account.name,
        'handler_key': account.handler_key,
        'account_type_id': account.account_type.id,
        'account_type': account.account_type.name,
        'bank_id': account.account_type.bank.id,
        'bank_name': account.account_type.bank.name,
        'household_id': account.household_id,
        'household_name': account.household.name,
        'created_at': account.created_at,
        'updated_at': account.updated_at,
    }
