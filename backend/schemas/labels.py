"""
schemas/labels.py — API schemas for label endpoints.
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
    """Request schema for creating a label.

    A single label is created for each unique household in ``household_ids``.
    If a label with the same name already exists in a given household it is
    skipped and reported in the ``failed`` list of LabelCreateResult.
    Duplicate household IDs are silently deduplicated.
    """

    name: str
    color: str = '#6B7280'
    category: str = ''
    household_id: int


class LabelUpdateRequest(Schema):
    """Request schema for updating a label.

    At least one field must be provided. Only provided fields are updated.
    """

    name: str | None = None
    color: str | None = None
    category: str | None = None
