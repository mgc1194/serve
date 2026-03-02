"""
schemas/households.py — API schemas for household endpoints.

Schemas define the API contract independently from the database models.
"""

from datetime import datetime
from typing import List

from ninja import Schema


class HouseholdSchema(Schema):
    """Minimal household representation — id and name only.

    Used wherever a lightweight reference to a household is needed,
    e.g. embedded in UserSchema on auth endpoints.
    """

    id: int
    name: str


class MemberSchema(Schema):
    """Schema for a household member."""

    id: int
    email: str
    first_name: str
    last_name: str


class HouseholdDetailSchema(Schema):
    """Full household representation including members and timestamps.

    Used on household-specific endpoints where the full detail is needed.
    """

    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    members: List[MemberSchema]


class HouseholdRequest(Schema):
    """Request schema for creating a household."""

    name: str


class HouseholdRenameRequest(Schema):
    """Request schema for renaming a household."""

    name: str


class MemberRequest(Schema):
    """Request schema for adding a member to a household."""

    email: str
    