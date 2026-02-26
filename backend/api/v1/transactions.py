"""
api/v1/transactions.py — v1 transaction, account, and bank endpoints.

Endpoints:
    POST /api/v1/transactions/import  — upload and import a single CSV file
    GET  /api/v1/accounts             — list accounts for a household
    GET  /api/v1/banks                — list banks with their account types
    GET  /api/v1/accounts/detect      — detect account type from filename
    GET  /api/v1/transactions         — list transactions for a household
"""

import io
import logging
from typing import List, Optional

from django.shortcuts import get_object_or_404
from ninja import Router, File
from ninja.files import UploadedFile

from transactions.models import Account, Bank, Transaction
from transactions.utils import detect_account_type, upsert_transactions
from transactions.handlers.accounts import ACCOUNT_HANDLERS
from schemas.transactions import AccountSchema, BankSchema, FileImportResult, TransactionSchema, DetectResponse

logger = logging.getLogger(__name__)

router = Router(tags=['Transactions'])


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post('/transactions/import', response=FileImportResult)
def import_transactions(
    request,
    account_id: int,
    file: UploadedFile = File(...),
):
    """Imports a single CSV file into the database.

    The account_id is selected/confirmed by the user in the UI
    after filename-based detection suggests a type.

    Args:
        request: The HTTP request object.
        account_id: The ID of the account the file belongs to.
        file: The uploaded CSV file.

    Returns:
        A FileImportResult with counts of inserted, skipped, and total rows.
    """
    account = get_object_or_404(Account, id=account_id)
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


@router.get('/accounts', response=List[AccountSchema])
def list_accounts(request, household_id: int):
    """Lists all accounts belonging to a household.

    Used to populate the account selector in the upload UI.

    Args:
        request: The HTTP request object.
        household_id: The ID of the household to list accounts for.

    Returns:
        A list of AccountSchema objects ordered by bank name then account name.
    """
    accounts = Account.objects.filter(
        household_id=household_id
    ).select_related('account_type__bank').order_by('account_type__bank__name', 'name')

    return [
        {
            'id': acc.id,
            'name': acc.name,
            'handler_key': acc.handler_key,
            'account_type': acc.account_type.name,
            'bank_id': acc.account_type.bank.id,
            'bank_name': acc.account_type.bank.name,
        }
        for acc in accounts
    ]


@router.get('/banks', response=List[BankSchema])
def list_banks(request):
    """Lists all banks with their account types.

    Used to group the account dropdown by bank in the UI.

    Args:
        request: The HTTP request object.

    Returns:
        A list of BankSchema objects ordered by bank name.
    """
    banks = Bank.objects.prefetch_related('account_types').order_by('name')

    return [
        {
            'id': bank.id,
            'name': bank.name,
            'account_types': [
                {
                    'id': at.id,
                    'name': at.name,
                    'handler_key': at.handler_key,
                }
                for at in bank.account_types.all()
            ],
        }
        for bank in banks
    ]


@router.get('/accounts/detect', response=DetectResponse)
def detect_account(request, filename: str):
    """Suggests an account type based on the uploaded filename.

    The suggestion is always shown to the user for confirmation.

    Args:
        request: The HTTP request object.
        filename: The name of the uploaded file.

    Returns:
        A DetectResponse with the detected handler key and a boolean flag.
    """
    handler_key = detect_account_type(filename)
    return DetectResponse(
        filename=filename,
        handler_key=handler_key,
        detected=handler_key is not None,
    )

@router.get('/transactions', response=List[TransactionSchema])
def list_transactions(
    request,
    household_id: int,
    account_id: Optional[int] = None,
):
    """Lists all transactions for a household.

    Scoped to a household. An optional account_id narrows results to a
    single account. Results are ordered by date descending.

    Args:
        request: The HTTP request object.
        household_id: The ID of the household to list transactions for.
        account_id: Optional. Narrows results to a single account.

    Returns:
        A list of TransactionSchema ordered by date descending.
    """
    qs = Transaction.objects.filter(
        account__household_id=household_id
    ).select_related('account__account_type__bank').order_by('-date')

    if account_id is not None:
        qs = qs.filter(account_id=account_id)

    return [
        {
            'id': t.id,
            'date': t.date.isoformat(),
            'concept': t.concept,
            'amount': float(t.amount),
            'label': t.label,
            'category': t.category,
            'additional_labels': t.additional_labels,
            'account_id': t.account_id,
            'account_name': t.account.name,
            'bank_name': t.account.account_type.bank.name,
            'imported_at': t.imported_at.isoformat(),
        }
        for t in qs
    ]
