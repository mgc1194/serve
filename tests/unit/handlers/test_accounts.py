"""
tests/unit/handlers/test_accounts.py — Unit tests for each account handler.
"""

import pytest
import pandas as pd
from io import StringIO

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


# ── SoFi Savings ──────────────────────────────────────────────────────────────

class TestSoFiSavingsHandler:
    CSV = "Date,Description,Amount\n2026-01-15,VENMO PAYMENT,-180.00\n"

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV)))
        return SoFiSavingsHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'SoFi Savings'

    def test_amount(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-180.00)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-01-15')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'VENMO PAYMENT'


# ── SoFi Checking ─────────────────────────────────────────────────────────────

class TestSoFiCheckingHandler:
    CSV = "Date,Description,Amount\n2026-02-01,DIRECT DEPOSIT,2500.00\n"

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV)))
        return SoFiCheckingHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'SoFi Checking'

    def test_amount(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(2500.00)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-01')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'DIRECT DEPOSIT'


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

    @pytest.fixture
    def debit(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV)))
        return CapitalOneCheckingHandler().process('fake.csv')

    @pytest.fixture
    def credit(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CREDIT_CSV)))
        return CapitalOneCheckingHandler().process('fake.csv')

    def test_returns_a_dataframe(self, debit):
        assert debit is not None

    def test_account_name(self, debit):
        assert debit['Account'].iloc[0] == 'CO Checking'

    def test_debit_amount_is_negative(self, debit):
        assert debit['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_credit_amount_is_positive(self, credit):
        assert credit['Amount'].iloc[0] == pytest.approx(1152.91)

    def test_date(self, debit):
        assert debit['Date'].iloc[0] == pd.Timestamp('2026-01-15')

    def test_concept(self, debit):
        assert debit['Concept'].iloc[0] == 'TRADER JOES'


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

    @pytest.fixture
    def debit(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.DEBIT_CSV)))
        return CapitalOneSavingsHandler().process('fake.csv')

    @pytest.fixture
    def credit(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CREDIT_CSV)))
        return CapitalOneSavingsHandler().process('fake.csv')

    def test_returns_a_dataframe(self, debit):
        assert debit is not None

    def test_account_name(self, debit):
        assert debit['Account'].iloc[0] == 'CO Savings'

    def test_debit_amount_is_negative(self, debit):
        assert debit['Amount'].iloc[0] == pytest.approx(-500.00)

    def test_credit_amount_is_positive(self, credit):
        assert credit['Amount'].iloc[0] == pytest.approx(500.00)

    def test_date(self, debit):
        assert debit['Date'].iloc[0] == pd.Timestamp('2026-01-15')


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

    @pytest.fixture
    def purchase(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PURCHASE_CSV)))
        return CapitalOneQuicksilverHandler().process('fake.csv')

    @pytest.fixture
    def payment(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.PAYMENT_CSV)))
        return CapitalOneQuicksilverHandler().process('fake.csv')

    def test_returns_a_dataframe(self, purchase):
        assert purchase is not None

    def test_account_name(self, purchase):
        assert purchase['Account'].iloc[0] == 'Quicksilver'

    def test_purchase_amount_is_negative(self, purchase):
        assert purchase['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_payment_amount_is_positive(self, payment):
        assert payment['Amount'].iloc[0] == pytest.approx(1152.91)

    def test_empty_credit_debit_cells_do_not_produce_nan(self, purchase):
        assert not purchase['Amount'].isna().any()

    def test_date(self, purchase):
        assert purchase['Date'].iloc[0] == pd.Timestamp('2026-01-15')


# ── Amex ──────────────────────────────────────────────────────────────────────

class TestAmexHandler:
    CSV = "Date,Description,Amount\n02/04/2026,METRO FARE,2.45\n"

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV)))
        return AmexHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'Delta'

    def test_amount_is_negated(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-2.45)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-04')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'METRO FARE'


# ── Chase ─────────────────────────────────────────────────────────────────────

class TestChaseHandler:
    CSV = "Transaction Date,Description,Amount\n02/15/2026,WHOLEFDS,-67.89\n"

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV)))
        return ChaseHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'Chase'

    def test_amount(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-67.89)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-15')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'WHOLEFDS'


# ── Discover ──────────────────────────────────────────────────────────────────

class TestDiscoverHandler:
    CSV = "Trans. Date,Description,Amount\n02/04/2026,AMAZON,29.99\n"

    @pytest.fixture
    def subject(self, mocker):
        mocker.patch('pandas.read_csv', return_value=pd.read_csv(StringIO(self.CSV)))
        return DiscoverHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'Discover'

    def test_amount_is_negated(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-29.99)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-04')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'AMAZON'


# ── Wells Fargo Checking ──────────────────────────────────────────────────────

class TestWellsFargoCheckingHandler:
    CSV = "02/15/2026,-45.50,*,_,GROCERY STORE\n"

    @pytest.fixture
    def subject(self, mocker):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        mocker.patch('pandas.read_csv', return_value=raw_df)
        return WellsFargoCheckingHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'WF Checking'

    def test_amount(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(-45.50)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-15')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'GROCERY STORE'


# ── Wells Fargo Savings ───────────────────────────────────────────────────────

class TestWellsFargoSavingsHandler:
    CSV = "02/15/2026,500.00,*,_,TRANSFER IN\n"

    @pytest.fixture
    def subject(self, mocker):
        raw_df = pd.read_csv(
            StringIO(self.CSV),
            names=['Date', 'Amount', '*', '_', 'Description'],
            header=None
        )
        mocker.patch('pandas.read_csv', return_value=raw_df)
        return WellsFargoSavingsHandler().process('fake.csv')

    def test_returns_a_dataframe(self, subject):
        assert subject is not None

    def test_account_name(self, subject):
        assert subject['Account'].iloc[0] == 'WF Savings'

    def test_amount(self, subject):
        assert subject['Amount'].iloc[0] == pytest.approx(500.00)

    def test_date(self, subject):
        assert subject['Date'].iloc[0] == pd.Timestamp('2026-02-15')

    def test_concept(self, subject):
        assert subject['Concept'].iloc[0] == 'TRANSFER IN'