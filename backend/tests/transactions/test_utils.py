"""
tests/transactions/test_utils.py — Unit tests for transactions.utils.

Covers upsert_transactions (dedupe-safe transaction insertion that
preserves user-managed fields like label on re-import).
Moved from tests/banking/test_utils.py as part of the Option A boundary
cleanup — upsert_transactions is owned by the transactions app since it
only creates and queries Transaction rows.
"""

import json
from datetime import date

import pandas as pd
import pytest

from banking.models import Account, AccountType, Bank
from transactions.models import Label, Transaction
from transactions.utils import upsert_transactions
from users.models import Household


@pytest.mark.django_db
class TestUpsertTransactions:
    @pytest.fixture
    def household(self):
        return Household.objects.create(name='Test Household')

    @pytest.fixture
    def bank(self):
        return Bank.objects.get(name='SoFi')

    @pytest.fixture
    def account_type(self):
        return AccountType.objects.get(handler_key='sofi-savings')

    @pytest.fixture
    def account(self, account_type, household):
        return Account.objects.create(
            name='Test Account',
            account_type=account_type,
            household=household,
        )

    @pytest.fixture
    def sample_df(self):
        return pd.DataFrame(
            {
                'dedupe_hash': ['abc123' * 10 + 'abc1', 'def456' * 10 + 'def0'],
                'raw_data': [
                    json.dumps(
                        {'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'}
                    ),
                    json.dumps(
                        {'Date': '2026-01-20', 'Description': 'METRO FARE', 'Amount': '-2.45'}
                    ),
                ],
                'Date': pd.to_datetime(['2026-01-15', '2026-01-20']),
                'Concept': ['TRADER JOES', 'METRO FARE'],
                'Amount': [-45.50, -2.45],
                'Label': [None, None],
                'Category': [None, None],
                'Additional Labels': [None, None],
            }
        )

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

    def test_preserves_existing_labels(self, household, account, sample_df):
        # First import
        upsert_transactions(sample_df, account)
        # Manually assign label
        label = Label.objects.create(name='Essential', household=household)
        txn = Transaction.objects.get(dedupe_hash='abc123' * 10 + 'abc1')
        txn.label = label
        txn.save()
        # Re-import
        upsert_transactions(sample_df, account)
        txn.refresh_from_db()
        assert txn.label == label

    def test_stores_correct_values(self, account, sample_df):
        upsert_transactions(sample_df, account)
        txn = Transaction.objects.get(dedupe_hash='abc123' * 10 + 'abc1')
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
            dedupe_hash='abc123' * 10 + 'abc1',
            date='2026-01-15',
            concept='TRADER JOES',
            amount=-45.50,
            account=account,
        )
        # Import batch with one existing, one new
        df = pd.DataFrame(
            {
                'dedupe_hash': ['abc123' * 10 + 'abc1', 'new999' * 10 + 'new0'],
                'raw_data': [
                    json.dumps(
                        {'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'}
                    ),
                    json.dumps(
                        {'Date': '2026-01-20', 'Description': 'NEW TRANSACTION', 'Amount': '-10.00'}
                    ),
                ],
                'Date': pd.to_datetime(['2026-01-15', '2026-01-20']),
                'Concept': ['TRADER JOES', 'NEW TRANSACTION'],
                'Amount': [-45.50, -10.00],
                'Label': [None, None],
                'Category': [None, None],
                'Additional Labels': [None, None],
            }
        )
        result = upsert_transactions(df, account)
        assert result['inserted'] == 1
        assert result['skipped'] == 1
        assert result['total'] == 2

    def test_deduplicates_within_incoming_batch(self, account):
        """Banks occasionally export the same row twice — only one should be inserted."""
        df = pd.DataFrame(
            {
                'dedupe_hash': ['abc123' * 10 + 'xxxx', 'abc123' * 10 + 'xxxx'],  # duplicate
                'raw_data': [
                    json.dumps(
                        {'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.5'}
                    ),
                    json.dumps(
                        {'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.5'}
                    ),
                ],
                'Date': pd.to_datetime(['2026-01-15', '2026-01-15']),
                'Concept': ['TRADER JOES', 'TRADER JOES'],
                'Amount': [-45.50, -45.50],
                'Label': [None, None],
                'Category': [None, None],
                'Additional Labels': [None, None],
            }
        )
        result = upsert_transactions(df, account)
        assert result['inserted'] == 1
        assert result['skipped'] == 1
        assert result['total'] == 2
        assert Transaction.objects.count() == 1

    def test_links_transactions_to_correct_account(self, account, household, bank):
        # Create second account
        at2 = AccountType.objects.create(name='Other', handler_key='Other', bank=bank)
        account2 = Account.objects.create(
            name='Other Account', account_type=at2, household=household
        )

        df1 = pd.DataFrame(
            {
                'dedupe_hash': ['abc123' * 10 + 'abc1'],
                'raw_data': [
                    json.dumps(
                        {'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'}
                    )
                ],
                'Date': pd.to_datetime(['2026-01-15']),
                'Concept': ['TXN 1'],
                'Amount': [-10.00],
                'Label': [None],
                'Category': [None],
                'Additional Labels': [None],
            }
        )
        df2 = pd.DataFrame(
            {
                'dedupe_hash': ['new999' * 10 + 'new0'],
                'raw_data': [
                    json.dumps(
                        {'Date': '2026-01-20', 'Description': 'NEW TRANSACTION', 'Amount': '-20.00'}
                    )
                ],
                'Date': pd.to_datetime(['2026-01-20']),
                'Concept': ['TXN 2'],
                'Amount': [-20.00],
                'Label': [None],
                'Category': [None],
                'Additional Labels': [None],
            }
        )

        upsert_transactions(df1, account)
        upsert_transactions(df2, account2)

        assert Transaction.objects.get(dedupe_hash='abc123' * 10 + 'abc1').account == account
        assert Transaction.objects.get(dedupe_hash='new999' * 10 + 'new0').account == account2

    def test_imported_transactions_have_import_source(self, account, sample_df):
        upsert_transactions(sample_df, account)
        txn = Transaction.objects.get(dedupe_hash='abc123' * 10 + 'abc1')
        assert txn.source == Transaction.Source.IMPORT
