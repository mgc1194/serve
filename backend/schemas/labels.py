"""
schemas/labels.py — API schemas for label endpoints.

Schemas define the API contract independently from the database models.
"""

from ninja import Schema


class LabelSchema(Schema):
    """Output schema for a Label."""

    id: int
    name: str
    color: str
    category: str
    household_id: int


class LabelCreateRequest(Schema):
    """Request schema for creating a label."""

    name: str
    color: str = '#6B7280'
    category: str = ''
    household_id: int


class LabelUpdateRequest(Schema):
    """Request schema for updating a label.

    All fields are optional — only provided fields are updated.
    """

    name: str | None = None
    color: str | None = None
    category: str | None = None
