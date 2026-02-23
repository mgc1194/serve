import pytest
import pandas as pd
from datetime import date

from transactions.utils import detect_account_type, upsert_transactions
from transactions.models import Account, AccountType, Bank, Transaction
from users.models import Household


class TestDetectAccountType:

    def test_detects_capital_one_checking(self):
        assert detect_account_type('360Checking.csv') == 'CO Checking'

    def test_detects_capital_one_savings(self):
        assert detect_account_type('360PerformanceSavings.csv') == 'CO Savings'

    def test_detects_quicksilver(self):
        assert detect_account_type('transaction_download.csv') == 'Quicksilver'

    def test_detects_sofi_checking(self):
        assert detect_account_type('SOFI-Checking-123.csv') == 'SoFi Checking'

    def test_detects_sofi_savings(self):
        assert detect_account_type('SOFI-Savings-456.csv') == 'SoFi Savings'

    def test_detects_wells_fargo_checking(self):
        assert detect_account_type('WF-Checking.csv') == 'WF Checking'

    def test_detects_wells_fargo_savings(self):
        assert detect_account_type('WF-Savings.csv') == 'WF Savings'

    def test_detects_amex_activity(self):
        assert detect_account_type('activity.csv') == 'Delta'

    def test_detects_chase(self):
        assert detect_account_type('Chase1234.csv') == 'Chase'

    def test_detects_discover(self):
        assert detect_account_type('Discover-Export.csv') == 'Discover'

    def test_returns_none_for_unknown_filename(self):
        assert detect_account_type('unknown_bank.csv') is None

    def test_returns_none_for_empty_filename(self):
        assert detect_account_type('') is None

    def test_detection_is_case_sensitive(self):
        # Our patterns are case-sensitive
        assert detect_account_type('sofi-checking.csv') is None

    def test_matches_substring_anywhere_in_filename(self):
        assert detect_account_type('SOFI-Savings-0000-2020-01-01T00_00_00.csv') == 'SoFi Savings'


# ── upsert_transactions tests ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestUpsertTransactions:

    @pytest.fixture
    def household(self):
        return Household.objects.create(name='Test Household')

    @pytest.fixture
    def bank(self):
        return Bank.objects.create(name='Test Bank')

    @pytest.fixture
    def account_type(self, bank):
        return AccountType.objects.create(
            name='Test Savings',
            handler_key='SoFi Savings',
            bank=bank,
        )

    @pytest.fixture
    def account(self, account_type, household):
        return Account.objects.create(
            name='Test Account',
            account_type=account_type,
            household=household,
        )

    @pytest.fixture
    def sample_df(self):
        return pd.DataFrame({
            'ID': ['abc123', 'def456'],
            'Date': pd.to_datetime(['2026-01-15', '2026-01-20']),
            'Concept': ['TRADER JOES', 'METRO FARE'],
            'Amount': [-45.50, -2.45],
            'Label': [None, None],
            'Category': [None, None],
            'Additional Labels': [None, None],
        })

    def test_inserts_new_transactions(self, account, sample_df):
        result = upsert_transactions(sample_df, account)
        assert result['inserted'] == 2
        assert result['skipped'] == 0
        assert result['total'] == 2
        assert Transaction.objects.count() == 2

    def test_skips_duplicate_transactions(self, account, sample_df):
        # First import
        upsert_transactions(sample_df, account)
        # Second import (duplicates)
        result = upsert_transactions(sample_df, account)
        assert result['inserted'] == 0
        assert result['skipped'] == 2
        assert result['total'] == 2
        assert Transaction.objects.count() == 2

    def test_preserves_existing_labels(self, account, sample_df):
        # First import
        upsert_transactions(sample_df, account)
        # Manually assign label
        txn = Transaction.objects.get(id='abc123')
        txn.label = 'Essential'
        txn.save()
        # Re-import
        upsert_transactions(sample_df, account)
        txn.refresh_from_db()
        assert txn.label == 'Essential'

    def test_preserves_existing_category(self, account, sample_df):
        upsert_transactions(sample_df, account)
        txn = Transaction.objects.get(id='abc123')
        txn.category = 'Groceries'
        txn.save()
        upsert_transactions(sample_df, account)
        txn.refresh_from_db()
        assert txn.category == 'Groceries'

    def test_stores_correct_values(self, account, sample_df):
        upsert_transactions(sample_df, account)
        txn = Transaction.objects.get(id='abc123')
        assert txn.date == date(2026, 1, 15)
        assert txn.concept == 'TRADER JOES'
        assert float(txn.amount) == pytest.approx(-45.50)
        assert txn.account == account

    def test_handles_datetime_objects(self, account, sample_df):
        # Ensure Date column has Timestamps, not just dates
        assert pd.api.types.is_datetime64_any_dtype(sample_df['Date'])
        result = upsert_transactions(sample_df, account)
        assert result['inserted'] == 2

    def test_returns_correct_counts_for_mixed_batch(self, account):
        # Create one existing transaction
        Transaction.objects.create(
            id='abc123',
            date='2026-01-15',
            concept='TRADER JOES',
            amount=-45.50,
            account=account,
        )
        # Import batch with one existing, one new
        df = pd.DataFrame({
            'ID': ['abc123', 'new999'],
            'Date': pd.to_datetime(['2026-01-15', '2026-01-20']),
            'Concept': ['TRADER JOES', 'NEW TRANSACTION'],
            'Amount': [-45.50, -10.00],
            'Label': [None, None],
            'Category': [None, None],
            'Additional Labels': [None, None],
        })
        result = upsert_transactions(df, account)
        assert result['inserted'] == 1
        assert result['skipped'] == 1
        assert result['total'] == 2

    def test_links_transactions_to_correct_account(self, account, household, bank):
        # Create second account
        at2 = AccountType.objects.create(name='Other', handler_key='Other', bank=bank)
        account2 = Account.objects.create(name='Other Account', account_type=at2, household=household)

        df1 = pd.DataFrame({
            'ID': ['txn1'],
            'Date': pd.to_datetime(['2026-01-15']),
            'Concept': ['TXN 1'],
            'Amount': [-10.00],
            'Label': [None],
            'Category': [None],
            'Additional Labels': [None],
        })
        df2 = pd.DataFrame({
            'ID': ['txn2'],
            'Date': pd.to_datetime(['2026-01-20']),
            'Concept': ['TXN 2'],
            'Amount': [-20.00],
            'Label': [None],
            'Category': [None],
            'Additional Labels': [None],
        })

        upsert_transactions(df1, account)
        upsert_transactions(df2, account2)

        assert Transaction.objects.get(id='txn1').account == account
        assert Transaction.objects.get(id='txn2').account == account2
