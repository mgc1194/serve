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
    household_ids: list[int]


class LabelCreateFailure(Schema):
    """Represents a single failed label creation attempt.

    ``household_name`` is None when the household could not be found.
    """

    household_id: int
    household_name: str | None
    reason: str


class LabelCreateResult(Schema):
    """Output schema for a multi-household label create operation.

    ``created`` contains the labels that were successfully created.
    ``failed`` contains one entry per household where creation was skipped,
    with a human-readable reason (e.g. name already exists).
    """

    created: list[LabelSchema]
    failed: list[LabelCreateFailure]


class LabelUpdateRequest(Schema):
    """Request schema for updating a label.

    At least one field must be provided. Only provided fields are updated.
    """

    name: str | None = None
    color: str | None = None
    category: str | None = None
