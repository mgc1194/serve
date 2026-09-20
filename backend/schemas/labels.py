"""
schemas/labels.py — API schemas for label endpoints.
"""

from ninja import Schema


class LabelSchema(Schema):
    """Output schema for a Label."""

    id: int
    name: str
    color: str
    category_id: int | None
    household_id: int


class LabelCreateRequest(Schema):
    """Request schema for creating a label."""

    name: str
    color: str = '#6B7280'
    category_id: int | None = None
    household_id: int


class LabelUpdateRequest(Schema):
    """Request schema for updating a label.

    At least one field must be provided. Only provided fields are updated.
    Setting ``category_id`` to null explicitly clears the label's category.
    """

    name: str | None = None
    color: str | None = None
    category_id: int | None = None
