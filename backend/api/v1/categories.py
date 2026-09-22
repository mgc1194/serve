"""
api/v1/categories.py — Category management endpoints.

Endpoints:
    GET    /api/v1/categories/        — list categories for the user's households
    POST   /api/v1/categories/        — create (or reactivate) a category in a household
    PATCH  /api/v1/categories/{id}/   — update a category's name or active state
    DELETE /api/v1/categories/{id}/   — soft-delete a category (is_active=False)
"""

import logging

from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from budgets.models import Category
from schemas.categories import CategoryCreateRequest, CategorySchema, CategoryUpdateRequest
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Categories'], auth=django_auth)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_category_for_member(category_id: int, user) -> Category:
    """Fetches a category and verifies the user is a member of its household.

    Args:
        category_id: Primary key of the category to fetch.
        user: The requesting user.

    Returns:
        The Category instance.

    Raises:
        HttpError: 404 if the category does not exist.
        HttpError: 403 if the user is not a member of the category's household.
    """
    category = get_object_or_404(Category.objects.select_related('household'), pk=category_id)
    if not category.household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return category


def _serialize(category: Category) -> dict:
    """Serializes a Category into a dict matching CategorySchema."""
    return {
        'id': category.id,
        'name': category.name,
        'type': category.type,
        'is_active': category.is_active,
        'household_id': category.household_id,
    }


# ── GET /categories/ ─────────────────────────────────────────────────────────


@router.get('/categories/', response=list[CategorySchema])
def list_categories(request, household_id: int | None = None, include_inactive: bool = False):
    """Returns categories for the user's households.

    Scoped to the requesting user — only categories belonging to households
    the user is a member of are returned. Results can be optionally narrowed
    to a single household via household_id. Defaults to active-only.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Optional. Filter results to a single household.
        include_inactive: If True, also include soft-deleted categories.

    Returns:
        A list of CategorySchema ordered by type, name.

    Raises:
        HttpError: 403 if household_id is provided but the user is not a member.
        HttpError: 404 if household_id is provided but does not exist.
    """
    if household_id is not None:
        household = get_object_or_404(Household, pk=household_id)
        if not household.users.filter(pk=request.user.pk).exists():
            raise HttpError(403, 'You are not a member of this household.')

    qs = Category.objects.filter(household__users=request.user)

    if household_id is not None:
        qs = qs.filter(household_id=household_id)

    if not include_inactive:
        qs = qs.filter(is_active=True)

    return [_serialize(category) for category in qs]


# ── POST /categories/ ────────────────────────────────────────────────────────


@router.post('/categories/', response=CategorySchema)
def create_category(request, payload: CategoryCreateRequest):
    """Creates a new category in a household, reactivating a soft-deleted one.

    The user must be a member of the target household. If a soft-deleted
    category already exists at (household, name, type), it is reactivated
    instead of creating a duplicate row — categories never free up their
    (household, name, type) tuple on delete, so recreating one is really a
    reactivation.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: CategoryCreateRequest with name, type, and household_id.

    Returns:
        The created (or reactivated) CategorySchema.

    Raises:
        HttpError: 400 if the name is blank.
        HttpError: 400 if an active category with that (name, type) already exists.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the household does not exist.
    """
    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Category name cannot be blank.')

    household = get_object_or_404(Household, pk=payload.household_id)
    if not household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    existing = Category.objects.filter(household=household, name=name, type=payload.type).first()
    if existing is not None:
        if existing.is_active:
            raise HttpError(400, f'A category named "{name}" already exists in this household.')
        existing.is_active = True
        existing.save(update_fields=['is_active', 'updated_at'])
        logger.info(
            f'User {request.user.email} reactivated category "{existing.name}" '
            f'(id={existing.id}) in household "{household.name}" (id={household.id}).'
        )
        return _serialize(existing)

    category = Category.objects.create(name=name, type=payload.type, household=household)

    logger.info(
        f'User {request.user.email} created category "{category.name}" '
        f'(id={category.id}) in household "{household.name}" (id={household.id}).'
    )

    return _serialize(category)


# ── PATCH /categories/{id}/ ──────────────────────────────────────────────────


@router.patch('/categories/{category_id}/', response=CategorySchema)
def update_category(request, category_id: int, payload: CategoryUpdateRequest):
    """Updates a category's name or active state.

    At least one field must be provided. Only modified fields are written to
    the database via ``update_fields``, so ``updated_at`` is not bumped
    unless something actually changed. ``type`` cannot be changed — the
    schema has no such field; delete and recreate to change it.

    Args:
        request: The HTTP request object. Must be authenticated.
        category_id: Primary key of the category to update.
        payload: CategoryUpdateRequest with at least one of name, is_active.

    Returns:
        The updated CategorySchema.

    Raises:
        HttpError: 400 if no fields are provided.
        HttpError: 400 if the new name is blank.
        HttpError: 400 if another category in the household already has that (name, type).
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the category does not exist.
    """
    category = _get_category_for_member(category_id, request.user)

    update_fields = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HttpError(400, 'Category name cannot be blank.')
        category.name = name
        update_fields.append('name')

    if payload.is_active is not None:
        category.is_active = payload.is_active
        update_fields.append('is_active')

    if not update_fields:
        raise HttpError(400, 'At least one field must be provided.')

    try:
        category.save(update_fields=[*update_fields, 'updated_at'])
    except IntegrityError:
        raise HttpError(
            400, f'A category named "{category.name}" already exists in this household.'
        ) from None

    logger.info(
        f'User {request.user.email} updated category (id={category.id}) '
        f'in household (id={category.household_id}).'
    )

    return _serialize(category)


# ── DELETE /categories/{id}/ ─────────────────────────────────────────────────


@router.delete('/categories/{category_id}/', response={204: None})
def delete_category(request, category_id: int):
    """Soft-deletes a category by setting is_active to False.

    Never hard-deletes — a category referenced by any historical budget line
    must remain resolvable. Labels already linked to this category keep their
    category_id; only the category is hidden from pickers.

    Args:
        request: The HTTP request object. Must be authenticated.
        category_id: Primary key of the category to soft-delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the category does not exist.
    """
    category = _get_category_for_member(category_id, request.user)
    category.is_active = False
    category.save(update_fields=['is_active', 'updated_at'])

    logger.info(f'User {request.user.email} deactivated category (id={category_id}).')

    return None
