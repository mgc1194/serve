import pytest
from unittest.mock import Mock
import pandas as pd

from django.core.files.uploadedfile import SimpleUploadedFile

from ninja.testing import TestClient

from transactions.api import router
from transactions.constants import HandlerKeys
from transactions.models import Bank, AccountType, Account
from users.models import Household


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def household():
    return Household.objects.create(name='Test Household')


@pytest.fixture
def bank(db):
    # Use seeded bank for system-defined data
    return Bank.objects.get(name="SoFi")


@pytest.fixture
def account_type(db):
    # Use seeded account type for system-defined data
    return AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)


@pytest.fixture
def account(account_type, household):
    return Account.objects.create(
        name='Test Account',
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def client():
    return TestClient(router)


@pytest.fixture
def sample_csv_content():
    """Sample CSV content as bytes."""
    return b"Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n"


@pytest.fixture
def sample_dataframe():
    """Sample processed DataFrame from a handler."""
    return pd.DataFrame({
        'ID': ['abc123'],
        'Date': pd.to_datetime(['2026-01-15']),
        'Concept': ['TRADER JOES'],
        'Account': ['Test Account'],
        'Amount': [-45.50],
        'Label': [None],
        'Category': [None],
        'Additional Labels': [None],
    })


@pytest.fixture
def csv_file(sample_csv_content):
    return SimpleUploadedFile("test.csv", sample_csv_content, content_type="text/csv")

# ── GET /api/accounts ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestListAccounts:

    def test_returns_accounts_for_household(self, client, account, household):
        response = client.get(f'/accounts?household_id={household.id}')
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['name'] == 'Test Account'

    def test_returns_empty_for_nonexistent_household(self, client):
        response = client.get('/accounts?household_id=9999')
        assert response.status_code == 200
        assert response.json() == []

    def test_orders_by_bank_name_then_account_name(self, client, household):
        at1 = AccountType.objects.get(handler_key='sofi-checking')
        at2 = AccountType.objects.get(handler_key='sofi-savings')
        Account.objects.create(name='B Account', account_type=at1, household=household)
        Account.objects.create(name='A Account', account_type=at2, household=household)

        response = client.get(f'/accounts?household_id={household.id}')
        data = response.json()
        assert data[0]['name'] == 'A Account'
        assert data[1]['name'] == 'B Account'


# ── GET /api/banks ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestListBanks:

    def test_returns_all_banks(self, client, bank):
        response = client.get('/banks')
        assert response.status_code == 200

        data = response.json()
        # Check that all seeded banks are returned
        returned_names = {b['name'] for b in data}
        expected_names = {b.name for b in Bank.objects.all()}
        assert returned_names == expected_names
        assert len(data) == Bank.objects.count()


# ── GET /api/accounts/detect ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestDetectAccount:

    def test_detects_known_filename(self, client):
        response = client.get('/accounts/detect?filename=SOFI-Savings.csv')
        assert response.status_code == 200
        data = response.json()
        assert data['handler_key'] == 'sofi-savings'
        assert data['detected'] is True

    def test_returns_null_for_unknown_filename(self, client):
        response = client.get('/accounts/detect?filename=unknown.csv')
        assert response.status_code == 200
        data = response.json()
        assert data['handler_key'] is None
        assert data['detected'] is False


# ── POST /api/transactions/import ────────────────────────────────────────────

@pytest.mark.django_db
class TestImportTransactions:

    def test_successful_import(self, client, account, csv_file, sample_dataframe, mocker):
        # Mock the handler
        mock_handler = Mock()
        mock_handler.process.return_value = sample_dataframe
        mocker.patch.dict('transactions.handlers.accounts.ACCOUNT_HANDLERS', {'SoFi Savings': mock_handler})

        # Mock upsert to avoid DB writes
        mocker.patch('transactions.api.upsert_transactions', return_value={'inserted': 1, 'skipped': 0, 'total': 1})

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['filename'] == 'test.csv'
        assert data['inserted'] == 1
        assert data['skipped'] == 0
        assert data['total'] == 1
        assert data['error'] is None

    def test_returns_error_for_nonexistent_account(self, client, csv_file):
        response = client.post(
            '/transactions/import?account_id=9999',
            FILES={'file': csv_file}
        )
        assert response.status_code == 404

    def test_returns_error_for_missing_handler(self, client, account, csv_file, mocker):
        # Empty handler dict
        mocker.patch.dict('transactions.handlers.accounts.ACCOUNT_HANDLERS', {}, clear=True)

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['inserted'] == 0
        assert 'No handler found' in data['error']

    def test_returns_error_for_empty_dataframe(self, client, account, csv_file, mocker):
        # Mock handler returns empty DataFrame
        mock_handler = Mock()
        mock_handler.process.return_value = pd.DataFrame()
        mocker.patch.dict('transactions.handlers.accounts.ACCOUNT_HANDLERS', {'sofi-savings': mock_handler})

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['inserted'] == 0
        assert 'no valid transactions' in data['error']

    def test_handles_handler_exception(self, client, account, csv_file, mocker):
        # Mock handler raises exception
        mock_handler = Mock()
        mock_handler.process.side_effect = Exception('Handler error')
        mocker.patch.dict('transactions.handlers.accounts.ACCOUNT_HANDLERS', {'sofi-savings': mock_handler})

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['inserted'] == 0
        assert 'Handler error' in data['error']
