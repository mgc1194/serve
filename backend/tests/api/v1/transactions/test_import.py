"""
tests/api/v1/transactions/test_import.py — Tests for POST /transactions/import.

Root conftest provides: alice, account.
transactions/conftest.py provides: client, csv_file, sample_dataframe.
"""

from unittest.mock import Mock

import pandas as pd
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.datastructures import MultiValueDict


@pytest.mark.django_db
class TestImportTransactions:
    def test_import_returns_200(self, client, alice, account, csv_file, monkeypatch):
        mock_handler = Mock()
        mock_handler.process.return_value = pd.DataFrame(
            [
                {
                    'dedupe_hash': 'import' * 10 + 'abcd',
                    'raw_data': '{}',
                    'Date': pd.Timestamp('2026-01-15'),
                    'Concept': 'TRADER JOES',
                    'Amount': -45.50,
                }
            ]
        )
        monkeypatch.setattr(
            'api.v1.transactions.upsert_transactions',
            lambda df, acc: {'inserted': 1, 'skipped': 0, 'total': 1},
        )
        monkeypatch.setitem(
            __import__('api.v1.transactions', fromlist=['ACCOUNT_HANDLERS']).ACCOUNT_HANDLERS,
            account.handler_key,
            mock_handler,
        )
        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES=MultiValueDict({'file': [csv_file]}),
            user=alice,
        )
        assert response.status_code == 200

    def test_import_with_multiple_files_returns_400(self, client, alice, account, csv_file):
        second_csv_file = SimpleUploadedFile(
            'second.csv',
            b'Date,Description,Amount\n2026-01-16,COSTCO,-120.00\n',
            content_type='text/csv',
        )
        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES=MultiValueDict({'file': [csv_file, second_csv_file]}),
            user=alice,
        )
        assert response.status_code == 400
