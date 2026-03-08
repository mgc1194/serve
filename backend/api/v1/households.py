"""
api/v1/households.py — Household management endpoints.

Endpoints:
    GET    /api/v1/households/                          — list user's households
    POST   /api/v1/households/                          — create a household
    GET    /api/v1/households/{id}/                     — get a single household
    PATCH  /api/v1/households/{id}/                     — rename a household
    DELETE /api/v1/households/{id}/                     — delete a household
    POST   /api/v1/households/{id}/members/             — add a member by email
    DELETE /api/v1/households/{id}/members/{user_id}/   — remove a member
"""

import logging

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from schemas.households import (
    HouseholdDetailSchema,
    HouseholdRenameRequest,
    HouseholdRequest,
    MemberRequest,
)
from users.models import CustomUser, Household

logger = logging.getLogger(__name__)


def _normalize_name(name: str) -> str:
    """Strips whitespace and capitalizes the first letter of a household name.

    Only the first character is uppercased — the rest of the string is
    left as-is so names like 'McAllister household' are preserved correctly.

    Examples:
        '  smith household  ' → 'Smith household'
        'mcAllister place'    → 'McAllister place'

    Args:
        name: Raw name string from the request payload.

    Returns:
        Normalized name string, or empty string if blank.
    """
    stripped = name.strip()
    if not stripped:
        return ''
    return stripped[0].upper() + stripped[1:]


def _name_exists_for_user(name: str, user, exclude_household_id: int | None = None) -> bool:
    """Returns True if the user already has a household with this name.

    Args:
        name: Normalized household name to check.
        user: The user whose households are checked.
        exclude_household_id: Household pk to exclude from the check (for renames).

    Returns:
        True if a duplicate exists, False otherwise.
    """
    qs = user.households.filter(name=name)
    if exclude_household_id:
        qs = qs.exclude(pk=exclude_household_id)
    return qs.exists()



router = Router(tags=['Households'], auth=django_auth)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_household_for_member(household_id: int, user: CustomUser) -> Household:
    """Fetches a household and verifies the user is a member.

    Args:
        household_id: Primary key of the household to fetch.
        user: The requesting user.

    Returns:
        The Household instance with members prefetched.

    Raises:
        HttpError: 404 if the household does not exist.
        HttpError: 403 if the user is not a member of the household.
    """
    household = get_object_or_404(
        Household.objects.prefetch_related('users'),
        pk=household_id,
    )
    if not any(u.pk == user.pk for u in household.users.all()):  # uses prefetched cache
        raise HttpError(403, 'You are not a member of this household.')
    return household


def _serialize(household: Household) -> dict:
    """Serializes a Household into a dict matching HouseholdDetailSchema.

    Assumes members (users) have already been prefetched.

    Args:
        household: The Household instance to serialize.

    Returns:
        A dict with household fields and a list of member dicts.
    """
    return {
        'id': household.id,
        'name': household.name,
        'created_at': household.created_at,
        'updated_at': household.updated_at,
        'members': [
            {
                'id': u.id,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
            }
            for u in household.users.all()
        ],
    }


# ── List ──────────────────────────────────────────────────────────────────────

@router.get('/households/', response=list[HouseholdDetailSchema])
def list_households(request):
    """Returns all households the current user belongs to.

    Args:
        request: The HTTP request object. Must be authenticated.

    Returns:
        A list of HouseholdDetailSchema schemas.
    """
    households = (
        Household.objects
        .filter(users=request.user)
        .prefetch_related('users')
        .order_by('name')
    )
    return [_serialize(h) for h in households]


# ── Create ────────────────────────────────────────────────────────────────────

@router.post('/households/', response=HouseholdDetailSchema)
def create_household(request, payload: HouseholdRequest):
    """Creates a new household and adds the creator as its first member.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: HouseholdRequest with the household name.

    Returns:
        The created HouseholdDetailSchema.

    Raises:
        HttpError: 400 if the name is blank.
    """
    name = _normalize_name(payload.name)
    if not name:
        raise HttpError(400, 'Household name cannot be blank.')

    if _name_exists_for_user(name, request.user):
        raise HttpError(400, f'You already have a household named "{name}".')

    household = Household.objects.create(name=name)
    household.users.add(request.user)

    logger.info(
        f'User {request.user.email} created household '
        f'"{household.name}" (id={household.id}).'
    )

    household = Household.objects.prefetch_related('users').get(pk=household.pk)
    return _serialize(household)


# ── Detail ────────────────────────────────────────────────────────────────────

@router.get('/households/{household_id}/', response=HouseholdDetailSchema)
def get_household(request, household_id: int):
    """Returns a single household.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Primary key of the household.

    Returns:
        The HouseholdDetailSchema for the requested household.

    Raises:
        HttpError: 404 if the household does not exist.
        HttpError: 403 if the user is not a member.
    """
    household = _get_household_for_member(household_id, request.user)
    return _serialize(household)


# ── Rename ────────────────────────────────────────────────────────────────────

@router.patch('/households/{household_id}/', response=HouseholdDetailSchema)
def rename_household(request, household_id: int, payload: HouseholdRenameRequest):
    """Renames an existing household.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Primary key of the household.
        payload: HouseholdRenameRequest with the new name.

    Returns:
        The updated HouseholdDetailSchema.

    Raises:
        HttpError: 400 if the new name is blank.
        HttpError: 403 if the user is not a member.
        HttpError: 404 if the household does not exist.
    """
    household = _get_household_for_member(household_id, request.user)

    name = _normalize_name(payload.name)
    if not name:
        raise HttpError(400, 'Household name cannot be blank.')

    if _name_exists_for_user(name, request.user, exclude_household_id=household.id):
        raise HttpError(400, f'You already have a household named "{name}".')

    household.name = name
    household.save(update_fields=['name', 'updated_at'])

    logger.info(
        f'User {request.user.email} renamed household '
        f'(id={household.id}) to "{household.name}".'
    )

    household = Household.objects.prefetch_related('users').get(pk=household.pk)
    return _serialize(household)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete('/households/{household_id}/', response={204: None})
def delete_household(request, household_id: int):
    """Deletes a household.

    Any accounts linked to this household will be blocked from deletion
    by the PROTECT constraint on Account.household. The caller must
    remove all accounts before deleting the household.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Primary key of the household.

    Returns:
        204 No Content on success — empty response body.

    Raises:
        HttpError: 403 if the user is not a member.
        HttpError: 404 if the household does not exist.
        HttpError: 409 if the household still has accounts attached.
    """
    from django.db.models import ProtectedError

    household = _get_household_for_member(household_id, request.user)

    try:
        household.delete()
    except ProtectedError:
        raise HttpError(
            409,
            'This household still has accounts. '
            'Remove all accounts before deleting the household.',
        ) from None

    logger.info(
        f'User {request.user.email} deleted household (id={household_id}).'
    )

    return 204, None


# ── Add member ────────────────────────────────────────────────────────────────

@router.post('/households/{household_id}/members/', response=HouseholdDetailSchema)
def add_member(request, household_id: int, payload: MemberRequest):
    """Adds a user to a household by email address.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Primary key of the household.
        payload: MemberRequest with the email of the user to add.

    Returns:
        The updated HouseholdDetailSchema including the new member.

    Raises:
        HttpError: 400 if no account exists for the given email.
        HttpError: 400 if the user is already a member.
        HttpError: 403 if the requesting user is not a member.
        HttpError: 404 if the household does not exist.
    """
    household = _get_household_for_member(household_id, request.user)

    email = payload.email.strip().lower()

    try:
        new_member = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        raise HttpError(400, 'No account found with that email address.') from None

    if household.users.filter(pk=new_member.pk).exists():
        raise HttpError(400, 'This user is already a member of the household.')

    household.users.add(new_member)

    logger.info(
        f'User {request.user.email} added {new_member.email} '
        f'to household (id={household.id}).'
    )

    household = Household.objects.prefetch_related('users').get(pk=household.pk)
    return _serialize(household)


# ── Remove member ─────────────────────────────────────────────────────────────

@router.delete('/households/{household_id}/members/{user_id}/', response=HouseholdDetailSchema)
def remove_member(request, household_id: int, user_id: int):
    """Removes a member from a household.

    A user can remove themselves (leave) or remove any other member,
    since all members are equal. The last member cannot be removed —
    the household must be explicitly deleted instead.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Primary key of the household.
        user_id: Primary key of the user to remove.

    Returns:
        The updated HouseholdDetailSchema without the removed member.

    Raises:
        HttpError: 400 if the target user is not a member.
        HttpError: 400 if removing would leave the household with no members.
        HttpError: 403 if the requesting user is not a member.
        HttpError: 404 if the household does not exist.
    """
    household = _get_household_for_member(household_id, request.user)

    try:
        target = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        raise HttpError(400, 'User not found.') from None

    if not household.users.filter(pk=target.pk).exists():
        raise HttpError(400, 'This user is not a member of the household.')

    if household.users.count() == 1:
        raise HttpError(
            400,
            'Cannot remove the last member. Delete the household instead.',
        )

    household.users.remove(target)

    logger.info(
        f'User {request.user.email} removed {target.email} '
        f'from household (id={household.id}).'
    )

    household = Household.objects.prefetch_related('users').get(pk=household.pk)
    return _serialize(household)
