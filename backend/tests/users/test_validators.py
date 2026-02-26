import pytest

from django.core.exceptions import ValidationError

from users.validators import (
    validate_email_format,
    MinimumLengthValidator,
    UppercaseLetterValidator,
    LowercaseLetterValidator,
    NumericCharacterValidator,
    SpecialCharacterValidator,
)


class TestValidateEmailFormat:

    def test_valid_email_returns_none(self):
        assert validate_email_format('john@example.com') is None

    def test_valid_email_with_subdomain_returns_none(self):
        assert validate_email_format('john@mail.example.com') is None

    def test_missing_at_symbol_returns_error(self):
        assert validate_email_format('johnexample.com') is not None

    def test_missing_domain_dot_returns_error(self):
        assert validate_email_format('john@examplecom') is not None

    def test_missing_local_part_returns_error(self):
        assert validate_email_format('@example.com') is not None

    def test_whitespace_in_email_returns_error(self):
        assert validate_email_format('john @example.com') is not None

    def test_empty_string_returns_error(self):
        assert validate_email_format('') is not None


class TestMinimumLengthValidator:

    def setup_method(self):
        self.validator = MinimumLengthValidator(min_length=14)

    def test_password_at_minimum_length_passes(self):
        self.validator.validate('A' * 14)

    def test_password_above_minimum_length_passes(self):
        self.validator.validate('A' * 20)

    def test_password_below_minimum_length_raises(self):
        with pytest.raises(ValidationError) as exc:
            self.validator.validate('A' * 13)
        assert 'password_too_short' in exc.value.code

    def test_custom_min_length_is_respected(self):
        validator = MinimumLengthValidator(min_length=8)
        validator.validate('A' * 8)
        with pytest.raises(ValidationError):
            validator.validate('A' * 7)

    def test_get_help_text_contains_min_length(self):
        assert '14' in self.validator.get_help_text()


class TestUppercaseLetterValidator:

    def setup_method(self):
        self.validator = UppercaseLetterValidator()

    def test_password_with_uppercase_passes(self):
        self.validator.validate('hasUpperCase1!')

    def test_password_without_uppercase_raises(self):
        with pytest.raises(ValidationError) as exc:
            self.validator.validate('nouppercase1!')
        assert 'password_no_uppercase' in exc.value.code

    def test_get_help_text_is_not_empty(self):
        assert len(self.validator.get_help_text()) > 0


class TestLowercaseLetterValidator:

    def setup_method(self):
        self.validator = LowercaseLetterValidator()

    def test_password_with_lowercase_passes(self):
        self.validator.validate('HASLOWERcase1!')

    def test_password_without_lowercase_raises(self):
        with pytest.raises(ValidationError) as exc:
            self.validator.validate('NOLOWERCASE1!')
        assert 'password_no_lowercase' in exc.value.code

    def test_get_help_text_is_not_empty(self):
        assert len(self.validator.get_help_text()) > 0


class TestNumericCharacterValidator:

    def setup_method(self):
        self.validator = NumericCharacterValidator()

    def test_password_with_digit_passes(self):
        self.validator.validate('HasADigit1!')

    def test_password_without_digit_raises(self):
        with pytest.raises(ValidationError) as exc:
            self.validator.validate('NoDigitsHere!')
        assert 'password_no_number' in exc.value.code

    def test_get_help_text_is_not_empty(self):
        assert len(self.validator.get_help_text()) > 0


class TestSpecialCharacterValidator:

    def setup_method(self):
        self.validator = SpecialCharacterValidator(min_count=1)

    def test_password_with_special_char_passes(self):
        self.validator.validate('HasSpecial1!')

    def test_password_without_special_char_raises(self):
        with pytest.raises(ValidationError) as exc:
            self.validator.validate('NoSpecialChar1')
        assert 'password_no_special' in exc.value.code

    def test_custom_min_count_is_respected(self):
        validator = SpecialCharacterValidator(min_count=2)
        validator.validate('Has2Special1!@')
        with pytest.raises(ValidationError):
            validator.validate('Has1Special1!')

    def test_get_help_text_contains_min_count(self):
        assert '1' in self.validator.get_help_text()
