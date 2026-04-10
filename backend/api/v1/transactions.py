"""
api/v1/transactions.py — Transaction management endpoints.

Endpoints:
    GET    /api/v1/transactions/          — list transactions for a household
    POST   /api/v1/transactions/          — manually create a transaction
    PATCH  /api/v1/transactions/{id}/     — edit concept, label, or summary visibility
    DELETE /api/v1/transactions/{id}/     — delete a transaction
    POST   /api/v1/transactions/import    — upload and import a single CSV file
"""

import hashlib
import io
import logging
from enum import StrEnum

from django.db import IntegrityError
from django.db.models import F, Q, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from ninja import File, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile
from ninja.security import django_auth

from schemas.transactions import (
    FileImportResult,
    PaginatedTransactionsSchema,
    TransactionCreateRequest,
    TransactionSchema,
    TransactionUpdateRequest,
    decode_cursor,
    encode_cursor,
)
from transactions.handlers.accounts import ACCOUNT_HANDLERS
from transactions.models import Account, Label, Transaction
from transactions.utils import upsert_transactions
from users.models import Household

logger = logging.getLogger(__name__)

router = Router(tags=['Transactions'], auth=django_auth)

PAGE_SIZE = 20


class SortField(StrEnum):
    date = 'date'
    concept = 'concept'
    amount = 'amount'
    account = 'account'
    label = 'label'
    category = 'category'


# ── Field metadata ────────────────────────────────────────────────────────────

# Maps SortField to the ORM field name used in ORDER BY and WHERE.
# label and category use annotated fields so Django emits LEFT JOINs
# rather than INNER JOINs (which would silently drop unlabelled rows).
_SORT_FIELD = {
    SortField.date: 'date',
    SortField.concept: 'concept',
    SortField.amount: 'amount',
    SortField.account: 'account_name_sort',
    SortField.label: 'label_name_sort',
    SortField.category: 'category_sort',
}

# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_transaction_for_household_member(transaction_id: int, user) -> Transaction:
    """Fetches a transaction and verifies the user is a member of its household.

    Args:
        transaction_id: Primary key of the transaction.
        user: The requesting user.

    Returns:
        The Transaction instance with account and bank pre-selected.

    Raises:
        HttpError: 404 if the transaction does not exist.
        HttpError: 403 if the user is not a member of the household.
    """
    transaction = get_object_or_404(
        Transaction.objects.select_related(
            'account__account_type__bank', 'account__household', 'label'
        ),
        pk=transaction_id,
    )
    if not transaction.account.household.users.filter(pk=user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')
    return transaction


def _serialize(t: Transaction) -> dict:
    """Serializes a Transaction into a dict matching TransactionSchema."""
    return {
        'id': t.id,
        'date': t.date.isoformat(),
        'concept': t.concept,
        'amount': float(t.amount),
        'label_id': t.label_id,
        'label_name': t.label.name if t.label else None,
        'label_color': t.label.color if t.label else None,
        'category': t.category,
        'additional_labels': t.additional_labels,
        'exclude_from_summary': t.exclude_from_summary,
        'source': t.source,
        'account_id': t.account_id,
        'account_name': t.account.name,
        'bank_name': t.account.account_type.bank.name,
        'imported_at': t.imported_at.isoformat(),
    }


def _make_dedupe_hash(account_id: int, date: str, concept: str, amount: str) -> str:
    """Derives a SHA256 dedupe hash from the core manual-transaction fields.

        NOTE: This helper currently hashes only ``account_id``, ``date``,
        ``concept``, and ``amount`` for manually created transactions. CSV
        import handlers may use a different strategy (for example, hashing the
        entire raw CSV row), so dedupe hashes for imported transactions are not
        guaranteed to collide with those produced here, even for otherwise
        identical transactions.

    Args:
        account_id: The account the transaction belongs to.
        date: ISO-format date string (YYYY-MM-DD).
        concept: The transaction description.
        amount: String representation of the amount.

    Returns:
        A 64-character hex SHA256 digest.
    """
    raw = f'{account_id}|{date}|{concept}|{amount}'
    return hashlib.sha256(raw.encode()).hexdigest()


def _apply_sort(qs, sort: str, direction: str):
    """Applies ORDER BY to a queryset using annotated fields for nullable sorts."""
    db_dir = '' if direction == 'asc' else '-'
    f = _SORT_FIELD[sort]
    return qs.order_by(f'{db_dir}{f}', f'{db_dir}id')


def _get_sort_value(row, sort: str) -> str:
    """Extracts the boundary row's sort value for cursor encoding.

    Nullable fields (label, category) are coalesced to '' — matching the
    annotation value so cursor round-trips are consistent.
    """
    if sort == SortField.label:
        return row.label.name if row.label else ''
    if sort == SortField.category:
        return row.category if row.category else ''
    if sort == SortField.account:
        return row.account.name
    if sort == SortField.concept:
        return row.concept
    if sort == SortField.amount:
        return str(row.amount)
    return row.date.isoformat()


def _apply_cursor_filter(qs, sort: SortField, direction: str, sort_value: str, cursor_id: int):
    """Filters to rows strictly after the cursor in the given direction.

    All nullable fields are coalesced to '' in the annotation, so '' is a
    valid sort value meaning "no label / no category". The keyset filter
    works uniformly across all fields:

        DESC: (field, id) < (sort_value, cursor_id)
        ASC:  (field, id) > (sort_value, cursor_id)

    This works correctly for '' boundaries too:
    - ASC  + '': rows where field > '' (labelled rows) OR field = '' AND id > cursor_id
    - DESC + '': rows where field < '' → empty (nothing sorts before '') OR
                 field = '' AND id < cursor_id (more unlabelled rows)
    """
    f = _SORT_FIELD[sort]

    if direction == 'desc':
        return qs.filter(Q(**{f'{f}__lt': sort_value}) | Q(**{f: sort_value, 'id__lt': cursor_id}))
    else:
        return qs.filter(Q(**{f'{f}__gt': sort_value}) | Q(**{f: sort_value, 'id__gt': cursor_id}))


def _compute_offset(base_qs, sort: SortField, sort_dir: str, first_row) -> int:
    """Zero-based index of first_row. Only implemented for date sort."""
    if sort != SortField.date:
        return 0
    date_val = first_row.date.isoformat()
    if sort_dir == 'desc':
        return base_qs.filter(Q(date__gt=date_val) | Q(date=date_val, id__gt=first_row.id)).count()
    else:
        return base_qs.filter(Q(date__lt=date_val) | Q(date=date_val, id__lt=first_row.id)).count()


# ── GET /transactions/ ────────────────────────────────────────────────────────


@router.get('/transactions/', response=PaginatedTransactionsSchema)
def list_transactions(
    request,
    household_id: int,
    account_id: int | None = None,
    cursor: str | None = None,
    previous_cursor: str | None = None,
    sort: SortField = SortField.date,
    sort_dir: str = 'desc',
):
    """Lists transactions for a household with cursor-based pagination.

    Results are stable across concurrent imports because pagination is
    keyset-based — inserting new transactions does not shift existing pages.

    Nullable sort fields (label, category) are coalesced to empty string,
    meaning unlabelled/uncategorised rows sort first in ASC and last in DESC.

    Pagination:
    - First page:    no cursor params.
    - Next page:     cursor = previous response next_cursor.
    - Previous page: previous_cursor = previous response previous_cursor.

    Args:
        request:         The HTTP request. Must be authenticated.
        household_id:    The household to list transactions for.
        account_id:      Optional account filter.
        cursor:          Opaque forward-pagination cursor. Mutually exclusive
                         with previous_cursor.
        previous_cursor: Opaque backward-pagination cursor. Mutually exclusive
                         with cursor.
        sort:            Sort field. Default: date.
        sort_dir:        'asc' or 'desc'. Default: desc.

    Returns:
        PaginatedTransactionsSchema.

    Raises:
        HttpError 400: invalid sort_dir, unparseable cursor, or both cursor
                     and previous_cursor provided simultaneously.
        HttpError 403: user not a household member.
        HttpError 404: household not found.
    """
    if sort_dir not in ('asc', 'desc'):
        raise HttpError(400, "sort_dir must be 'asc' or 'desc'.")

    if cursor is not None and previous_cursor is not None:
        raise HttpError(400, "'cursor' and 'previous_cursor' are mutually exclusive.")

    household = get_object_or_404(Household, pk=household_id)
    if not household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    # Annotate nullable sort fields so ORDER BY uses LEFT JOINs.
    # label__name and category are nullable — coalescing to '' means:
    #   - Unlabelled/uncategorised rows sort first in ASC ('' < any label)
    #   - Unlabelled/uncategorised rows sort last in DESC ('' < any label)
    # account__name is non-nullable but annotated for consistency.
    base_qs = (
        Transaction.objects.filter(account__household_id=household_id)
        .select_related('account__account_type__bank', 'label')
        .annotate(
            label_name_sort=Coalesce(F('label__name'), Value('')),
            category_sort=Coalesce(F('category'), Value('')),
            account_name_sort=F('account__name'),
        )
    )
    if account_id is not None:
        base_qs = base_qs.filter(account_id=account_id)

    count = base_qs.count()

    going_backwards = previous_cursor is not None
    active_cursor = previous_cursor if going_backwards else cursor
    fetch_dir = ('asc' if sort_dir == 'desc' else 'desc') if going_backwards else sort_dir

    sort_value: str | None = None
    cursor_id: int | None = None

    if active_cursor is not None:
        decoded = decode_cursor(active_cursor)
        if decoded is None:
            raise HttpError(400, 'Invalid cursor.')
        sort_value, cursor_id = decoded

    qs = _apply_sort(base_qs, sort, fetch_dir)

    if sort_value is not None and cursor_id is not None:
        qs = _apply_cursor_filter(qs, sort, fetch_dir, sort_value, cursor_id)

    rows = list(qs[: PAGE_SIZE + 1])
    has_more = len(rows) > PAGE_SIZE
    rows = rows[:PAGE_SIZE]

    if going_backwards:
        rows = list(reversed(rows))

    next_cursor: str | None = None
    prev_cursor: str | None = None

    if rows:
        first = rows[0]
        last = rows[-1]

        if going_backwards:
            next_cursor = encode_cursor(_get_sort_value(last, sort), last.id)
            if has_more:
                prev_cursor = encode_cursor(_get_sort_value(first, sort), first.id)
        else:
            if has_more:
                next_cursor = encode_cursor(_get_sort_value(last, sort), last.id)
            if cursor is not None:
                prev_cursor = encode_cursor(_get_sort_value(first, sort), first.id)

    offset = 0
    if rows and active_cursor is not None:
        offset = _compute_offset(base_qs, sort, sort_dir, rows[0])

    return PaginatedTransactionsSchema(
        results=[_serialize(t) for t in rows],
        count=count,
        offset=offset,
        next_cursor=next_cursor,
        previous_cursor=prev_cursor,
        sort=sort,
        sort_dir=sort_dir,
    )


# ── POST /transactions/ ───────────────────────────────────────────────────────


@router.post('/transactions/', response=TransactionSchema)
def create_transaction(request, payload: TransactionCreateRequest):
    """Manually creates a single transaction.

        A SHA256-based ``dedupe_hash`` is derived from the account, date,
        normalized concept, and amount. This hash is used to detect and prevent
        creation of identical manual transactions for the same account.

        The user must be a member of the household that owns the target account.

    Args:
        request: The HTTP request object. Must be authenticated.
        payload: TransactionCreateRequest with account_id, date, concept,
            and amount.

    Returns:
        The created TransactionSchema.

    Raises:
        HttpError: 400 if concept is blank.
        HttpError: 400 if a transaction with the same dedupe hash already exists.
        HttpError: 403 if the user is not a member of the account's household.
        HttpError: 404 if the account does not exist.

    Note:
        Duplicate detection for manual creations is based on the derived
        ``dedupe_hash`` and uses get_or_create rather than a separate existence
        check to avoid a TOCTOU race condition under concurrent requests.
    """
    concept = payload.concept.strip()
    if not concept:
        raise HttpError(400, 'Transaction concept cannot be blank.')

    account = get_object_or_404(
        Account.objects.select_related('account_type__bank', 'household'),
        pk=payload.account_id,
    )
    if not account.household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    date_str = payload.date.isoformat()
    amount_str = f'{payload.amount:.2f}'
    dedupe_hash_id = _make_dedupe_hash(account.id, date_str, concept, amount_str)

    try:
        transaction, created = Transaction.objects.get_or_create(
            dedupe_hash=dedupe_hash_id,
            account=account,
            defaults={
                'date': payload.date,
                'concept': concept,
                'amount': payload.amount,
                'raw_data': None,
                'source': Transaction.Source.MANUAL,
            },
        )
    except IntegrityError:
        raise HttpError(400, 'An identical transaction already exists.') from None

    if not created:
        raise HttpError(400, 'An identical transaction already exists.')

    logger.info(
        f'User {request.user.email} manually created transaction '
        f'(id={transaction.id}) in account "{account.name}" (id={account.id}).'
    )

    return _serialize(transaction)


# ── PATCH /transactions/{id}/ ─────────────────────────────────────────────────


@router.patch('/transactions/{transaction_id}/', response=TransactionSchema)
def update_transaction(request, transaction_id: int, payload: TransactionUpdateRequest):
    """Edits a transaction's concept, label, or summary visibility.

    Both fields are independently optional — omitting a field leaves it
    unchanged. Setting ``label_id`` to null explicitly removes the label.

    The label must belong to the same household as the transaction's account.
    This is enforced at the API layer to prevent cross-household assignment
    even when the API is called directly outside the UI.

    The user must be a member of the household that owns the transaction.

    Args:
        request: The HTTP request object. Must be authenticated.
        transaction_id: Primary key of the transaction to edit.
        payload: TransactionUpdateRequest with optional concept, label_id,
                 and/or exclude_from_summary.

    Returns:
        The updated TransactionSchema.

    Raises:
        HttpError: 400 if no fields are provided.
        HttpError: 400 if concept is explicitly null.
        HttpError: 400 if the new concept is blank.
        HttpError: 400 if label_id references a label from a different household.
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the transaction or label does not exist.
    """
    transaction = _get_transaction_for_household_member(transaction_id, request.user)

    update_fields = []

    if 'concept' in payload.model_fields_set:
        if payload.concept is None:
            raise HttpError(400, 'Transaction concept cannot be null.')
        concept = payload.concept.strip()
        if not concept:
            raise HttpError(400, 'Transaction concept cannot be blank.')
        transaction.concept = concept
        update_fields.append('concept')

    # label_id requires special handling: None means "remove the label", so we
    # cannot use "is not None" to detect whether the field was sent. Instead we
    # check model_fields_set, which pydantic populates with the keys that were
    # explicitly included in the request body.
    if 'label_id' in payload.model_fields_set:
        if payload.label_id is None:
            transaction.label = None
            transaction.label_id = None
        else:
            label = get_object_or_404(Label, pk=payload.label_id)
            if label.household_id != transaction.account.household_id:
                raise HttpError(
                    400,
                    'Label does not belong to the same household as this transaction.',
                )
            transaction.label = label
            transaction.label_id = label.pk
        update_fields.append('label')

    if (
        'exclude_from_summary' in payload.model_fields_set
        and payload.exclude_from_summary is not None
    ):
        transaction.exclude_from_summary = payload.exclude_from_summary
        update_fields.append('exclude_from_summary')

    if not update_fields:
        raise HttpError(400, 'At least one field must be provided.')

    transaction.save(update_fields=update_fields)

    logger.info(
        f'User {request.user.email} updated transaction '
        f'(id={transaction.id}) in account (id={transaction.account_id}).'
    )

    return _serialize(transaction)


# ── DELETE /transactions/{id}/ ────────────────────────────────────────────────


@router.delete('/transactions/{transaction_id}/', response={204: None})
def delete_transaction(request, transaction_id: int):
    """Deletes a transaction.

    The user must be a member of the household that owns the transaction.

    Args:
        request: The HTTP request object. Must be authenticated.
        transaction_id: Primary key of the transaction to delete.

    Returns:
        204 No Content on success.

    Raises:
        HttpError: 403 if the user is not a member of the household.
        HttpError: 404 if the transaction does not exist.
    """
    transaction = _get_transaction_for_household_member(transaction_id, request.user)
    transaction.delete()

    logger.info(
        f'User {request.user.email} deleted transaction '
        f'(id={transaction_id}) from account (id={transaction.account_id}).'
    )

    return 204, None


# ── POST /transactions/import ─────────────────────────────────────────────────


@router.post('/transactions/import', response=FileImportResult)
def import_transactions(
    request,
    account_id: int,
    file: UploadedFile = File(...),  # noqa: B008
):
    """Imports a single CSV file into the database.

    The account_id is selected/confirmed by the user in the UI
    after filename-based detection suggests a type.

    Args:
        request: The HTTP request object. Must be authenticated.
        account_id: The ID of the account the file belongs to.
        file: The uploaded CSV file.

    Returns:
        A FileImportResult with counts of inserted, skipped, and total rows.

    Raises:
        HttpError: 403 if the user is not a member of the account's household.
        HttpError: 404 if the account does not exist.
    """
    account = get_object_or_404(
        Account.objects.select_related('household'),
        id=account_id,
    )
    if not account.household.users.filter(pk=request.user.pk).exists():
        raise HttpError(403, 'You are not a member of this household.')

    handler = ACCOUNT_HANDLERS.get(account.handler_key)

    if handler is None:
        return FileImportResult(
            filename=file.name,
            inserted=0,
            skipped=0,
            total=0,
            error=f'No handler found for account type: {account.handler_key}',
        )

    try:
        content = file.read()
        buffer = io.BytesIO(content)
        df = handler.process(buffer)

        if df is None or df.empty:
            return FileImportResult(
                filename=file.name,
                inserted=0,
                skipped=0,
                total=0,
                error='File produced no valid transactions.',
            )

        counts = upsert_transactions(df, account)
        return FileImportResult(filename=file.name, **counts)

    except Exception as e:
        logger.exception(f'Error importing {file.name}: {e}')
        return FileImportResult(
            filename=file.name,
            inserted=0,
            skipped=0,
            total=0,
            error=str(e),
        )
