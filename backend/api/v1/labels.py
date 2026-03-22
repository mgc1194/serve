"""
api/v1/labels.py — Label management endpoints.

Endpoints:
    GET    /api/v1/labels/        — list labels for the user's households
    POST   /api/v1/labels/        — create a label across one or more households
    PATCH  /api/v1/labels/{id}/   — update a label's name, color, or category
    DELETE /api/v1/labels/{id}/   — delete a label (SET_NULL on transactions)
"""

import logging

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from ninja.security import django_auth

from schemas.labels import (
    LabelCreateFailure,
    LabelCreateRequest,
    LabelCreateResult,
    LabelSchema,
    LabelUpdateRequest,
)
from transactions.models import Label
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Labels'], auth=django_auth)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_label_for_member(label_id: int, user) -> Label:
    """Fetches a label and verifies the user is a member of its household."""
    label = get_object_or_404(Label.objects.select_related('household'), pk=label_id)
    if not label.household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return label


def _serialize(label: Label) -> dict:
    """Serializes a Label into a dict matching LabelSchema."""
    return {
        'id': label.id,
        'name': label.name,
        'color': label.color,
        'category': label.category,
        'household_id': label.household_id,
    }


# ── GET /labels/ ──────────────────────────────────────────────────────────────


@router.get('/labels/', response=list[LabelSchema])
def list_labels(request, household_id: int | None = None):
    """Returns labels for the user's households.

    Scoped to the requesting user — only labels belonging to households the
    user is a member of are returned. Results can be optionally narrowed to
    a single household via household_id.

    Args:
        request: The HTTP request object. Must be authenticated.
        household_id: Optional. Filter results to a single household.

    Returns:
        A list of LabelSchema ordered by category, name.

    Raises:
        HttpError: 403 if household_id is provided but the user is not a member.
        HttpError: 404 if household_id is provided but does not exist.
    """
    if household_id is not None:
        household = get_object_or_404(Household, pk=household_id)
        if not household.users.filter(pk=request.user.pk).exists():
            raise HttpError(403, 'You are not a member of this household.')

    qs = Label.objects.filter(household__users=request.user)

    if household_id is not None:
        qs = qs.filter(household_id=household_id)

    return [_serialize(label) for label in qs]


# ── POST /labels/ ─────────────────────────────────────────────────────────────


@router.post('/labels/', response=LabelCreateResult)
def create_label(request, payload: LabelCreateRequest):
    """Creates a label across one or more households.

    Deduplicates ``household_ids`` before processing. Bulk-fetches all
    requested households in a single query. Attempts to create the label in
    each household — failures (not found, not a member, duplicate name) are
    collected and returned rather than aborting the request.

    Each create attempt runs in its own savepoint so an IntegrityError in one
    household does not break the outer transaction.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: LabelCreateRequest with name, color, category, and household_ids.

    Returns:
        LabelCreateResult with ``created`` and ``failed`` lists.

    Raises:
        HttpError: 400 if the name is blank.
        HttpError: 400 if household_ids is empty.
    """
    name = payload.name.strip()
    if not name:
        raise HttpError(400, 'Label name cannot be blank.')

    # Deduplicate while preserving order.
    seen = set()
    unique_ids = [hid for hid in payload.household_ids if not (hid in seen or seen.add(hid))]

    if not unique_ids:
        raise HttpError(400, 'At least one household must be selected.')

    # Bulk-fetch all requested households in one query.
    household_map = {
        h.pk: h for h in Household.objects.filter(pk__in=unique_ids).prefetch_related('users')
    }

    created = []
    failed = []

    for household_id in unique_ids:
        household = household_map.get(household_id)

        if household is None:
            failed.append(
                LabelCreateFailure(
                    household_id=household_id,
                    household_name=None,
                    reason='Household not found.',
                )
            )
            continue

        if not household.users.filter(pk=request.user.pk).exists():
            failed.append(
                LabelCreateFailure(
                    household_id=household_id,
                    household_name=household.name,
                    reason='You are not a member of this household.',
                )
            )
            continue

        try:
            with transaction.atomic():
                label = Label.objects.create(
                    name=name,
                    color=payload.color,
                    category=payload.category.strip(),
                    household=household,
                )
            created.append(label)
            logger.info(
                f'User {request.user.email} created label "{label.name}" '
                f'(id={label.id}) in household "{household.name}" (id={household.id}).'
            )
        except IntegrityError:
            failed.append(
                LabelCreateFailure(
                    household_id=household_id,
                    household_name=household.name,
                    reason=f'A label named "{name}" already exists in this household.',
                )
            )

    return LabelCreateResult(
        created=[_serialize(lbl) for lbl in created],
        failed=failed,
    )


# ── PATCH /labels/{id}/ ───────────────────────────────────────────────────────


@router.patch('/labels/{label_id}/', response=LabelSchema)
def update_label(request, label_id: int, payload: LabelUpdateRequest):
    """Updates a label's name, color, or category.

    At least one field must be provided. Only modified fields are written to
    the database via ``update_fields``, so ``updated_at`` is not bumped unless
    something actually changed.

    Args:
        request: The HTTP request object. Must be authenticated.
        label_id: Primary key of the label to update.
        payload: LabelUpdateRequest with at least one of name, color, category.

    Returns:
        The updated LabelSchema.

    Raises:
        HttpError: 400 if no fields are provided.
        HttpError: 400 if the new name is blank.
        HttpError: 400 if another label in the household already has that name.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the label does not exist.
    """
    label = _get_label_for_member(label_id, request.user)

    update_fields = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HttpError(400, 'Label name cannot be blank.')
        label.name = name
        update_fields.append('name')

    if payload.color is not None:
        label.color = payload.color
        update_fields.append('color')

    if payload.category is not None:
        label.category = payload.category.strip()
        update_fields.append('category')

    if not update_fields:
        raise HttpError(400, 'At least one field must be provided.')

    try:
        label.save(update_fields=[*update_fields, 'updated_at'])
    except IntegrityError:
        raise HttpError(
            400, f'A label named "{label.name}" already exists in this household.'
        ) from None

    logger.info(
        f'User {request.user.email} updated label (id={label.id}) '
        f'in household (id={label.household_id}).'
    )

    return _serialize(label)


# ── DELETE /labels/{id}/ ──────────────────────────────────────────────────────


@router.delete('/labels/{label_id}/', response={204: None})
def delete_label(request, label_id: int):
    """Deletes a label.

    Transactions that reference this label will have their label field set
    to NULL — they are never deleted.

    Args:
        request: The HTTP request object. Must be authenticated.
        label_id: Primary key of the label to delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the label does not exist.
    """
    label = _get_label_for_member(label_id, request.user)
    label.delete()

    logger.info(f'User {request.user.email} deleted label (id={label_id}).')

    return 204, None
