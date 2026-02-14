"""
tests/unit/handlers/test_base.py — Unit tests for BaseHandler.

Tests ID generation, DataFrame output shape, error handling,
and the negate_amount flag without touching the filesystem.
"""

import pytest
import hashlib
import pandas as pd
from io import StringIO
from unittest.mock import patch, mock_open

from handlers.base import BaseHandler


# ── Minimal concrete handler for testing ──────────────────────────────────────

class SimpleHandler(BaseHandler):
    account     = 'Test Account'
    date_format = '%Y-%m-%d'
    col_date    = 'Date'
    col_concept = 'Description'
    col_amount  = 'Amount'


class NegatingHandler(BaseHandler):
    account       = 'Negating Account'
    date_format   = '%Y-%m-%d'
    col_date      = 'Date'
    col_concept   = 'Description'
    col_amount    = 'Amount'
    negate_amount = True


SIMPLE_CSV = "Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n"
MULTI_ROW_CSV = "Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n2026-01-16,METRO FARE,-2.45\n"
EMPTY_CSV = "Date,Description,Amount\n"


# ── ID generation ─────────────────────────────────────────────────────────────

class TestGenerateId:
    def test_id_is_32_char_md5(self):
        row = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'})
        result = BaseHandler._generate_id(row)
        assert len(result) == 32
        assert all(c in '0123456789abcdef' for c in result)

    def test_same_row_produces_same_id(self):
        row = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'})
        assert BaseHandler._generate_id(row) == BaseHandler._generate_id(row)

    def test_different_rows_produce_different_ids(self):
        row1 = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'})
        row2 = pd.Series({'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-2.45'})
        assert BaseHandler._generate_id(row1) != BaseHandler._generate_id(row2)

    def test_id_uses_all_raw_columns(self):
        """ID should change if any raw column changes — including ones dropped during cleaning."""
        row1 = pd.Series({'Date': '2026-01-15', 'Description': 'ROTH IRA', 'Amount': '500.00', 'Balance': '10000.00'})
        row2 = pd.Series({'Date': '2026-01-15', 'Description': 'ROTH IRA', 'Amount': '500.00', 'Balance': '10500.00'})
        assert BaseHandler._generate_id(row1) != BaseHandler._generate_id(row2)


# ── Output DataFrame shape ────────────────────────────────────────────────────

class TestOutputShape:
    def test_output_columns(self):
        handler = SimpleHandler()
        with patch('builtins.open', mock_open(read_data=SIMPLE_CSV)):
            with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
                df = handler.process('fake_path.csv')
        expected = ['ID', 'Date', 'Concept', 'Account', 'Amount', 'Label', 'Category', 'Additional Labels']
        assert list(df.columns) == expected

    def test_account_name_is_set(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
            df = handler.process('fake_path.csv')
        assert df['Account'].iloc[0] == 'Test Account'

    def test_date_is_datetime(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
            df = handler.process('fake_path.csv')
        assert pd.api.types.is_datetime64_any_dtype(df['Date'])

    def test_label_category_additional_labels_are_none(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
            df = handler.process('fake_path.csv')
        assert df['Label'].iloc[0] is None
        assert df['Category'].iloc[0] is None
        assert df['Additional Labels'].iloc[0] is None

    def test_multiple_rows(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(MULTI_ROW_CSV))):
            df = handler.process('fake_path.csv')
        assert len(df) == 2


# ── Amount handling ───────────────────────────────────────────────────────────

class TestAmountHandling:
    def test_amount_passthrough(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
            df = handler.process('fake_path.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_amount_negation(self):
        handler = NegatingHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(SIMPLE_CSV))):
            df = handler.process('fake_path.csv')
        assert df['Amount'].iloc[0] == pytest.approx(45.50)


# ── Error handling ────────────────────────────────────────────────────────────

class TestErrorHandling:
    def test_file_not_found_returns_none(self):
        handler = SimpleHandler()
        result = handler.process('nonexistent_file.csv')
        assert result is None

    def test_empty_csv_returns_none(self):
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(EMPTY_CSV))):
            result = handler.process('fake_path.csv')
        assert result is None or len(result) == 0

    def test_missing_column_returns_none(self):
        bad_csv = "Date,WrongColumn,Amount\n2026-01-15,TRADER JOES,-45.50\n"
        handler = SimpleHandler()
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(bad_csv))):
            result = handler.process('fake_path.csv')
        assert result is None
