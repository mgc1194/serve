"""
users/validators.py — Custom validators for user registration inputs.

Password validators follow Django's validator interface and are registered
in settings.AUTH_PASSWORD_VALIDATORS. The email validator is a standalone
helper used directly in the API layer.
"""

import re
from typing import Optional

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _, ngettext


# ── Email ─────────────────────────────────────────────────────────────────────

# Matches: local@domain.tld — requires at least one dot in the domain part.
_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def validate_email_format(email: str) -> Optional[str]:
    """Validates that an email address has a recognisable format.

    Checks for the presence of an @ symbol and at least one dot in the
    domain part (e.g. user@example.com).

    Args:
        email: The email address string to validate.

    Returns:
        An error message string if validation fails, or None if valid.
    """
    if not _EMAIL_RE.match(email):
        return 'Enter a valid email address (e.g. user@example.com).'
    return None


# ── Password validators ───────────────────────────────────────────────────────

class MinimumLengthValidator:
    """Validates that a password meets a minimum character length.

    Attributes:
        min_length: The minimum number of characters required. Defaults to 14.
    """

    def __init__(self, min_length: int = 14):
        self.min_length = min_length

    def validate(self, password: str, _user=None) -> None:
        """Raises ValidationError if the password is shorter than min_length.

        Args:
            password: The password string to validate.
            _user: The user instance. Required by Django's validator interface
                but not used by this validator.

        Raises:
            ValidationError: If the password is too short.
        """
        if len(password) < self.min_length:
            raise ValidationError(
                _('This password must contain at least %(min_length)d characters.'),
                code='password_too_short',
                params={'min_length': self.min_length},
            )

    def get_help_text(self) -> str:
        """Returns a human-readable description of the minimum length requirement.

        Returns:
            A help text string describing the minimum length requirement.
        """
        return _('Your password must contain at least %(min_length)d characters.') % {
            'min_length': self.min_length,
        }


class UppercaseLetterValidator:
    """Validates that a password contains at least one uppercase letter."""

    def validate(self, password: str, _user=None) -> None:  # noqa: PLR6301
        """Raises ValidationError if the password has no uppercase letter.

        Args:
            password: The password string to validate.
            _user: The user instance. Required by Django's validator interface
                but not used by this validator.

        Raises:
            ValidationError: If no uppercase letter is found.
        """
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _('This password must contain at least one uppercase letter.'),
                code='password_no_uppercase',
            )

    @staticmethod
    def get_help_text() -> str:
        """Returns a human-readable description of the uppercase letter requirement.

        Returns:
            A help text string describing the uppercase letter requirement.
        """
        return _('Your password must contain at least one uppercase letter.')


class LowercaseLetterValidator:
    """Validates that a password contains at least one lowercase letter."""

    def validate(self, password: str, _user=None) -> None:  # noqa: PLR6301
        """Raises ValidationError if the password has no lowercase letter.

        Args:
            password: The password string to validate.
            _user: The user instance. Required by Django's validator interface
                but not used by this validator.

        Raises:
            ValidationError: If no lowercase letter is found.
        """
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _('This password must contain at least one lowercase letter.'),
                code='password_no_lowercase',
            )

    @staticmethod
    def get_help_text() -> str:
        """Returns a human-readable description of the lowercase letter requirement.

        Returns:
            A help text string describing the lowercase letter requirement.
        """
        return _('Your password must contain at least one lowercase letter.')


class NumericCharacterValidator:
    """Validates that a password contains at least one numeric digit."""

    def validate(self, password: str, _user=None) -> None:  # noqa: PLR6301
        """Raises ValidationError if the password contains no digits.

        Args:
            password: The password string to validate.
            _user: The user instance. Required by Django's validator interface
                but not used by this validator.

        Raises:
            ValidationError: If no digit is found.
        """
        if not re.search(r'\d', password):
            raise ValidationError(
                _('This password must contain at least one number.'),
                code='password_no_number',
            )

    @staticmethod
    def get_help_text() -> str:
        """Returns a human-readable description of the numeric character requirement.

        Returns:
            A help text string describing the numeric character requirement.
        """
        return _('Your password must contain at least one number.')


class SpecialCharacterValidator:
    """Validates that a password contains a minimum number of special characters.

    Attributes:
        min_count: The minimum number of special characters required. Defaults to 1.
    """

    _SPECIAL_CHARS = re.compile(r'[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;\'`~/]')

    def __init__(self, min_count: int = 1):
        self.min_count = min_count

    def validate(self, password: str, _user=None) -> None:
        """Raises ValidationError if the password lacks enough special characters.

        Args:
            password: The password string to validate.
            _user: The user instance. Required by Django's validator interface
                but not used by this validator.

        Raises:
            ValidationError: If fewer than min_count special characters are found.
        """
        if len(self._SPECIAL_CHARS.findall(password)) < self.min_count:
            raise ValidationError(
                ngettext(
                    'This password must contain at least %(min_count)d special character (e.g. !@#$%%^&*).',
                    'This password must contain at least %(min_count)d special characters (e.g. !@#$%%^&*).',
                    self.min_count,
                ),
                code='password_no_special',
                params={'min_count': self.min_count},
            )

    def get_help_text(self) -> str:
        """Returns a human-readable description of the special character requirement.

        Returns:
            A help text string describing the special character requirement.
        """
        return ngettext(
            'Your password must contain at least %(min_count)d special character (e.g. !@#$%%^&*).',
            'Your password must contain at least %(min_count)d special characters (e.g. !@#$%%^&*).',
            self.min_count,
        ) % {'min_count': self.min_count}
