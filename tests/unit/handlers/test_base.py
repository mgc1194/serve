"""
tests/unit/handlers/test_base.py — Unit tests for BaseHandler.
"""

import pytest
import pandas as pd
from io import StringIO

from handlers.base import BaseHandler


# ── Minimal concrete handlers for testing ─────────────────────────────────────

class SimpleHandler(BaseHandler):
    account = 'Test Account'
    date_format = '%Y-%m-%d'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'


class NegatingHandler(BaseHandler):
    account = 'Negating Account'
    date_format = '%Y-%m-%d'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'
    negate_amount = True


# ── Test data ─────────────────────────────────────────────────────────────────

SIMPLE_CSV = "Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n"
MULTI_ROW_CSV = "Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n2026-01-16,METRO FARE,-2.45\n"
EMPTY_CSV = "Date,Description,Amount\n"
BAD_CSV = "Date,WrongColumn,Amount\n2026-01-15,TRADER JOES,-45.50\n"


# ── ID generation ─────────────────────────────────────────────────────────────

class TestGenerateId:

    @pytest.fixture
    def row(self):
        return pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'})

    def test_produces_a_32_character_string(self, row):
        assert len(BaseHandler._generate_id(row)) == 32

    def test_produces_a_valid_hex_string(self, row):
        assert all(c in '0123456789abcdef' for c in BaseHandler._generate_id(row))

    def test_is_deterministic(self, row):
        assert BaseHandler._generate_id(row) == BaseHandler._generate_id(row)

    def test_different_amounts_produce_different_ids(self):
        row1 = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'})
        row2 = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-2.45'})
        assert BaseHandler._generate_id(row1) != BaseHandler._generate_id(row2)

    def test_uses_all_raw_columns_including_dropped_ones(self):
        """Balance column disambiguates otherwise identical Roth IRA contributions."""
        row1 = pd.Series({'Date': '2026-01-15', 'Description': 'Expense', 'Amount': '500.00', 'Balance': '10000.00'})
        row2 = pd.Series({'Date': '2026-01-15', 'Description': 'Expense', 'Amount': '500.00', 'Balance': '10500.00'})
        assert BaseHandler._generate_id(row1) != BaseHandler._generate_id(row2)


# ── Output DataFrame shape ────────────────────────────────────────────────────

class TestOutputShape:

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV)))
        return SimpleHandler().process('fake_path.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_has_correct_columns(self, subject):
        expected = ['ID', 'Date', 'Concept', 'Account', 'Amount', 'Label', 'Category', 'Additional Labels']
        assert list(subject.columns) == expected

    def test_has_correct_row_count(self, subject):
        assert len(subject) == 1

    def test_id_is_a_32_char_md5(self, subject):
        assert subject['ID'].str.len().eq(32).all()

    def test_account_name_is_set(self, subject):
        assert subject['Account'].iloc[0] == 'Test Account'

    def test_date_is_datetime(self, subject):
        assert pd.api.types.is_datetime64_any_dtype(subject['Date'])

    def test_label_is_none(self, subject):
        assert subject['Label'].iloc[0] is None

    def test_category_is_none(self, subject):
        assert subject['Category'].iloc[0] is None

    def test_additional_labels_is_none(self, subject):
        assert subject['Additional Labels'].iloc[0] is None


# ── Multiple rows ─────────────────────────────────────────────────────────────

class TestMultipleRows:

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(MULTI_ROW_CSV)))
        return SimpleHandler().process('fake_path.csv')

    def test_returns_correct_row_count(self, subject):
        assert len(subject) == 2

    def test_all_ids_are_unique(self, subject):
        assert subject['ID'].nunique() == 2


# ── Amount handling ───────────────────────────────────────────────────────────

class TestAmountPassthrough:

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV)))
        return SimpleHandler().process('fake_path.csv')

    def test_amount_is_preserved(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-45.50)


class TestAmountNegation:

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV)))
        return NegatingHandler().process('fake_path.csv')

    def test_amount_is_negated(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(45.50)


# ── Error handling ────────────────────────────────────────────────────────────

class TestErrorHandling:

    def test_returns_none_for_missing_file(self):
        result = SimpleHandler().process('nonexistent_file.csv')
        assert result is None

    def test_logs_error_for_missing_file(self, mocker):
        mock_logger = mocker.patch('handlers.base.logger')
        SimpleHandler().process('nonexistent_file.csv')
        mock_logger.error.assert_called_once()
        assert 'nonexistent_file.csv' in mock_logger.error.call_args[0][0]

    def test_returns_none_for_empty_csv(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(EMPTY_CSV)))
        assert SimpleHandler().process('fake_path.csv') is None

    def test_returns_none_for_empty_data_error(self, mocker):
        mocker.patch('pandas.read_csv', side_effect=pd.errors.EmptyDataError)
        assert SimpleHandler().process('fake_path.csv') is None

    def test_logs_error_for_empty_data_error(self, mocker):
        mocker.patch('pandas.read_csv', side_effect=pd.errors.EmptyDataError)
        mock_logger = mocker.patch('handlers.base.logger')
        SimpleHandler().process('fake_path.csv')
        mock_logger.error.assert_called_once_with('No data in file: fake_path.csv')

    def test_returns_none_for_parser_error(self, mocker):
        mocker.patch('pandas.read_csv', side_effect=pd.errors.ParserError)
        assert SimpleHandler().process('fake_path.csv') is None

    def test_logs_error_for_parser_error(self, mocker):
        mocker.patch('pandas.read_csv', side_effect=pd.errors.ParserError)
        mock_logger = mocker.patch('handlers.base.logger')
        SimpleHandler().process('fake_path.csv')
        mock_logger.error.assert_called_once()
        assert 'fake_path.csv' in mock_logger.error.call_args[0][0]

    def test_returns_none_for_missing_column(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(BAD_CSV)))
        assert SimpleHandler().process('fake_path.csv') is None

    def test_logs_error_for_unexpected_exception(self, mocker):
        mocker.patch('pandas.read_csv', side_effect=Exception('unexpected'))
        mock_logger = mocker.patch('handlers.base.logger')
        SimpleHandler().process('fake_path.csv')
        mock_logger.error.assert_called_once()
        assert 'unexpected' in mock_logger.error.call_args[0][0]
