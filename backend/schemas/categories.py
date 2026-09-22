"""
schemas/categories.py — API schemas for category endpoints.
"""

from typing import Literal

from ninja import Schema

CategoryType = Literal['earning', 'spending']


class CategorySchema(Schema):
    """Output schema for a Category."""

    id: int
    name: str
    type: CategoryType
    is_active: bool
    household_id: int


class CategoryCreateRequest(Schema):
    """Request schema for creating a category."""

    name: str
    type: CategoryType
    household_id: int


class CategoryUpdateRequest(Schema):
    """Request schema for updating a category.

    At least one field must be provided. ``type`` is deliberately absent —
    it is immutable after creation (matches the Category model's documented
    convention: changing type means delete and recreate).
    """

    name: str | None = None
    is_active: bool | None = None
