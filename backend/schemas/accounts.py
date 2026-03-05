from datetime import datetime

from ninja import Schema


class AccountCreateRequest(Schema):
    """Request body for creating an account."""

    household_id: int
    account_type_id: int
    name: str

class AccountDetailSchema(Schema):
    """
    Full account representation returned after create and on list.

    Includes bank, account type, and household context so the client can
    display and group accounts without follow-up requests.
    """

    id: int
    name: str
    handler_key: str
    account_type_id: int
    account_type: str
    bank_id: int
    bank_name: str
    household_id: int
    household_name: str
    created_at: datetime
    updated_at: datetime


class AccountRenameRequest(Schema):
    """Request schema for renaming an account.

    Only the name is editable. Account type is immutable after creation —
    to change type, delete the account and create a new one.
    """

    name: str
