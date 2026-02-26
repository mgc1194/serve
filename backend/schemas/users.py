"""
schemas/users.py — API schemas for user-related endpoints.

Schemas define the API contract independently from the database models.
Fields that are internal to the database (e.g. password hashes, internal
flags) are intentionally excluded here.
"""

from typing import List

from ninja import Schema


class HouseholdSchema(Schema):
    """Output schema for a Household."""

    id: int
    name: str


class UserSchema(Schema):
    """Output schema for a User.

    Exposes only the fields relevant to the API consumer.
    Password hashes and internal Django fields are not included.
    """

    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    households: List[HouseholdSchema]


class RegisterRequest(Schema):
    """Request schema for user registration."""

    email: str
    password: str
    confirm_password: str
    first_name: str = ''
    last_name: str = ''


class LoginRequest(Schema):
    """Request schema for user login."""

    email: str
    password: str


class MessageResponse(Schema):
    """Generic message response for simple confirmations."""

    message: str
