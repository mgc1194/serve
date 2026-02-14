"""
tests/unit/handlers/test_accounts.py — Unit tests for each account handler.

Each handler is tested for:
- Correct account name
- Correct date parsing
- Correct amount (including sign)
- Correct concept mapping
- Output DataFrame shape
"""

import pytest
import pandas as pd
from io import StringIO
from unittest.mock import patch

from handlers.accounts import (
    SoFiSavingsHandler,
    SoFiCheckingHandler,
    CapitalOneCheckingHandler,
    CapitalOneSavingsHandler,
    CapitalOneQuicksilverHandler,
    AmexHandler,
    ChaseHandler,
    DiscoverHandler,
    WellsFargoCheckingHandler,
    WellsFargoSavingsHandler,
)
from tests.conftest import assert_clean_dataframe


# ── SoFi Savings ──────────────────────────────────────────────────────────────

class TestSoFiSavingsHandler:
    CSV = "Date,Description,Amount\n2026-01-15,VENMO PAYMENT,-180.00\n"

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiSavingsHandler().process('fake.csv')
        assert_clean_dataframe(df, 'SoFi Savings')

    def test_amount(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiSavingsHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-180.00)

    def test_date_format(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiSavingsHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-01-15')


# ── SoFi Checking ─────────────────────────────────────────────────────────────

class TestSoFiCheckingHandler:
    CSV = "Date,Description,Amount\n2026-02-01,DIRECT DEPOSIT,2500.00\n"

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiCheckingHandler().process('fake.csv')
        assert_clean_dataframe(df, 'SoFi Checking')

    def test_amount(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiCheckingHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(2500.00)

    def test_date_format(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = SoFiCheckingHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-02-01')


# ── Capital One Checking ──────────────────────────────────────────────────────

class TestCapitalOneCheckingHandler:
    DEBIT_CSV = (
        "Transaction Date,Transaction Description,Transaction Amount,Transaction Type\n"
        "01/15/26,TRADER JOES,45.50,Debit\n"
    )
    CREDIT_CSV = (
        "Transaction Date,Transaction Description,Transaction Amount,Transaction Type\n"
        "01/15/26,MOBILE PAYMENT,1152.91,Credit\n"
    )

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV))):
            df = CapitalOneCheckingHandler().process('fake.csv')
        assert_clean_dataframe(df, 'CO Checking')

    def test_debit_is_negative(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV))):
            df = CapitalOneCheckingHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_credit_is_positive(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CREDIT_CSV))):
            df = CapitalOneCheckingHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(1152.91)

    def test_date_format(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV))):
            df = CapitalOneCheckingHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-01-15')


# ── Capital One Savings ───────────────────────────────────────────────────────

class TestCapitalOneSavingsHandler:
    DEBIT_CSV = (
        "Transaction Date,Transaction Description,Transaction Amount,Transaction Type\n"
        "01/15/26,TRANSFER OUT,500.00,Debit\n"
    )
    CREDIT_CSV = (
        "Transaction Date,Transaction Description,Transaction Amount,Transaction Type\n"
        "01/15/26,TRANSFER IN,500.00,Credit\n"
    )

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV))):
            df = CapitalOneSavingsHandler().process('fake.csv')
        assert_clean_dataframe(df, 'CO Savings')

    def test_debit_is_negative(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV))):
            df = CapitalOneSavingsHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-500.00)

    def test_credit_is_positive(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CREDIT_CSV))):
            df = CapitalOneSavingsHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(500.00)


# ── Capital One Quicksilver ───────────────────────────────────────────────────

class TestCapitalOneQuicksilverHandler:
    PURCHASE_CSV = (
        "Transaction Date,Description,Credit,Debit\n"
        "2026-01-15,TRADER JOES,,45.50\n"
    )
    PAYMENT_CSV = (
        "Transaction Date,Description,Credit,Debit\n"
        "2026-01-15,MOBILE PAYMENT,1152.91,\n"
    )

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PURCHASE_CSV))):
            df = CapitalOneQuicksilverHandler().process('fake.csv')
        assert_clean_dataframe(df, 'Quicksilver')

    def test_purchase_is_negative(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PURCHASE_CSV))):
            df = CapitalOneQuicksilverHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_payment_is_positive(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PAYMENT_CSV))):
            df = CapitalOneQuicksilverHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(1152.91)

    def test_nan_columns_filled(self):
        """Empty Credit/Debit cells should not produce NaN amounts."""
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PURCHASE_CSV))):
            df = CapitalOneQuicksilverHandler().process('fake.csv')
        assert not df['Amount'].isna().any()


# ── Amex ──────────────────────────────────────────────────────────────────────

class TestAmexHandler:
    CSV = "Date,Description,Amount\n02/04/2026,METRO FARE,2.45\n"

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = AmexHandler().process('fake.csv')
        assert_clean_dataframe(df, 'Delta')

    def test_amount_is_negated(self):
        """Amex exports positive amounts for purchases — should be negated."""
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = AmexHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-2.45)

    def test_date_format(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = AmexHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-02-04')


# ── Chase ─────────────────────────────────────────────────────────────────────

class TestChaseHandler:
    CSV = "Transaction Date,Description,Amount\n02/15/2026,WHOLEFDS,-67.89\n"

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = ChaseHandler().process('fake.csv')
        assert_clean_dataframe(df, 'Chase')

    def test_amount(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = ChaseHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-67.89)

    def test_date_format(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = ChaseHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-02-15')


# ── Discover ──────────────────────────────────────────────────────────────────

class TestDiscoverHandler:
    CSV = "Trans. Date,Description,Amount\n02/04/2026,AMAZON,29.99\n"

    def test_output(self):
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = DiscoverHandler().process('fake.csv')
        assert_clean_dataframe(df, 'Discover')

    def test_amount_is_negated(self):
        """Discover exports positive amounts for purchases — should be negated."""
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = DiscoverHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-29.99)

    def test_date_column_name(self):
        """Discover uses 'Trans. Date' — verify it maps correctly."""
        with patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV))):
            df = DiscoverHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-02-04')


# ── Wells Fargo Checking ──────────────────────────────────────────────────────

class TestWellsFargoCheckingHandler:
    # Wells Fargo CSVs have no header row
    CSV = "02/15/2026,-45.50,*,_,GROCERY STORE\n"

    def test_output(self):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        with patch('pandas.read_csv', return_value=raw_df):
            df = WellsFargoCheckingHandler().process('fake.csv')
        assert_clean_dataframe(df, 'WF Checking')

    def test_amount(self):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        with patch('pandas.read_csv', return_value=raw_df):
            df = WellsFargoCheckingHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_date_format(self):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        with patch('pandas.read_csv', return_value=raw_df):
            df = WellsFargoCheckingHandler().process('fake.csv')
        assert df['Date'].iloc[0] == pd.Timestamp('2026-02-15')


# ── Wells Fargo Savings ───────────────────────────────────────────────────────

class TestWellsFargoSavingsHandler:
    CSV = "02/15/2026,500.00,*,_,TRANSFER IN\n"

    def test_output(self):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        with patch('pandas.read_csv', return_value=raw_df):
            df = WellsFargoSavingsHandler().process('fake.csv')
        assert_clean_dataframe(df, 'WF Savings')

    def test_amount(self):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        with patch('pandas.read_csv', return_value=raw_df):
            df = WellsFargoSavingsHandler().process('fake.csv')
        assert df['Amount'].iloc[0] == pytest.approx(500.00)