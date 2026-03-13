"""
tests/api/v1/test_transactions.py — Tests for transaction management endpoints.
"""

from unittest.mock import Mock

import pandas as pd
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from ninja.testing import TestClient

from api.v1.transactions import router
from transactions.constants import HandlerKeys
from transactions.models import Account, AccountType, Transaction
from users.models import CustomUser, Household

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def client():
    return TestClient(router)


@pytest.fixture
def alice(db):
    return CustomUser.objects.create_user(
        username='alice',
        email='alice@example.com',
        password='Password1!',
    )


@pytest.fixture
def bob(db):
    return CustomUser.objects.create_user(
        username='bob',
        email='bob@example.com',
        password='Password1!',
    )


@pytest.fixture
def household(db, alice):
    """A household with alice as its only member."""
    h = Household.objects.create(name='Alice Household')
    h.users.add(alice)
    return h


@pytest.fixture
def other_household(db, bob):
    """A household that alice does not belong to."""
    h = Household.objects.create(name='Bob Household')
    h.users.add(bob)
    return h


@pytest.fixture
def account_type(db):
    return AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)


@pytest.fixture
def account(db, account_type, household):
    return Account.objects.create(
        name='Test Account',
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def transaction(db, account):
    return Transaction.objects.create(
        dedupe_hash='abc123' * 10 + 'abcd',  # 64 chars
        raw_data={'Date': '2026-01-15', 'Description': 'TRADER JOES', 'Amount': '-45.50'},
        date='2026-01-15',
        concept='TRADER JOES',
        amount=-45.50,
        account=account,
    )


@pytest.fixture
def csv_file():
    return SimpleUploadedFile(
        'test.csv',
        b'Date,Description,Amount\n2026-01-15,TRADER JOES,-45.50\n',
        content_type='text/csv',
    )


@pytest.fixture
def sample_dataframe():
    return pd.DataFrame(
        [
            {
                'dedupe_hash': 'abc123' * 10 + 'abcd',
                'Date': pd.Timestamp('2026-01-15'),
                'Concept': 'TRADER JOES',
                'Amount': -45.50,
            }
        ]
    )


# ── GET /transactions/ ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestListTransactions:
    def test_returns_transactions_for_household(self, client, alice, transaction, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['id'] == transaction.id

    def test_returns_empty_for_household_with_no_transactions(self, client, alice, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert response.json() == []

    def test_filters_by_account_id(
        self, client, alice, transaction, account, household, account_type
    ):
        second_account = Account.objects.create(
            name='Second Account',
            account_type=account_type,
            household=household,
        )
        Transaction.objects.create(
            dedupe_hash='def456' * 10 + 'def4',
            raw_data={'Date': '2026-01-16', 'Description': 'WHOLE FOODS', 'Amount': '-32.00'},
            date='2026-01-16',
            concept='WHOLE FOODS',
            amount=-32.00,
            account=second_account,
        )

        response = client.get(
            f'/transactions/?household_id={household.id}&account_id={account.id}',
            user=alice,
        )
        data = response.json()
        assert len(data) == 1
        assert data[0]['id'] == transaction.id

    def test_response_includes_account_and_bank_info(self, client, alice, transaction, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        data = response.json()[0]
        assert data['account_name'] == 'Test Account'
        assert data['bank_name'] == 'SoFi'

    def test_results_ordered_by_date_descending(self, client, alice, account, household):
        Transaction.objects.create(
            dedupe_hash='t1ab' + 'x' * 60,
            date='2026-01-01',
            concept='OLDER',
            amount=-10.00,
            account=account,
        )
        Transaction.objects.create(
            dedupe_hash='t2cd' + 'x' * 60,
            date='2026-01-15',
            concept='NEWER',
            amount=-20.00,
            account=account,
        )

        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        data = response.json()
        assert data[0]['concept'] == 'NEWER'
        assert data[1]['concept'] == 'OLDER'

    def test_unauthenticated_returns_401(self, client, household):
        response = client.get(f'/transactions/?household_id={household.id}')
        assert response.status_code == 401

    def test_returns_403_for_non_member(self, client, bob, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=bob)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/transactions/?household_id=9999', user=alice)
        assert response.status_code == 404


# ── POST /transactions/ ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreateTransaction:
    def test_creates_transaction_successfully(self, client, alice, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': 'WHOLE FOODS',
                'amount': -55.00,
            },
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['concept'] == 'WHOLE FOODS'
        assert data['amount'] == -55.00
        assert data['account_name'] == 'Test Account'

    def test_persists_to_database(self, client, alice, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': 'COSTCO',
                'amount': -120.00,
            },
            user=alice,
        )
        assert response.status_code == 200
        assert Transaction.objects.filter(concept='COSTCO').exists()

    def test_strips_whitespace_from_concept(self, client, alice, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': '  AMAZON  ',
                'amount': -12.99,
            },
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['concept'] == 'AMAZON'

    def test_blank_concept_returns_400(self, client, alice, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': '   ',
                'amount': -10.00,
            },
            user=alice,
        )
        assert response.status_code == 400
        assert 'concept cannot be blank' in response.json()['detail'].lower()

    def test_duplicate_transaction_returns_400(self, client, alice, account):
        payload = {
            'account_id': account.id,
            'date': '2026-02-01',
            'concept': 'NETFLIX',
            'amount': -15.99,
        }
        client.post('/transactions/', json=payload, user=alice)
        response = client.post('/transactions/', json=payload, user=alice)
        assert response.status_code == 400
        assert 'already exists' in response.json()['detail'].lower()

    def test_returns_403_for_non_member(self, client, bob, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': 'SPOTIFY',
                'amount': -9.99,
            },
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_account(self, client, alice):
        response = client.post(
            '/transactions/',
            json={
                'account_id': 9999,
                'date': '2026-02-01',
                'concept': 'HULU',
                'amount': -7.99,
            },
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, account):
        response = client.post(
            '/transactions/',
            json={
                'account_id': account.id,
                'date': '2026-02-01',
                'concept': 'TEST',
                'amount': -1.00,
            },
        )
        assert response.status_code == 401


# ── PATCH /transactions/{id}/ ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestUpdateTransaction:
    def test_updates_concept_successfully(self, client, alice, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': "TRADER JOE'S"},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['concept'] == "TRADER JOE'S"

    def test_persists_to_database(self, client, alice, transaction):
        client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'UPDATED CONCEPT'},
            user=alice,
        )
        transaction.refresh_from_db()
        assert transaction.concept == 'UPDATED CONCEPT'

    def test_strips_whitespace_from_concept(self, client, alice, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': '  TRIMMED  '},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['concept'] == 'TRIMMED'

    def test_blank_concept_returns_400(self, client, alice, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': '   '},
            user=alice,
        )
        assert response.status_code == 400
        assert 'concept cannot be blank' in response.json()['detail'].lower()

    def test_returns_403_for_non_member(self, client, bob, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'HACKED'},
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_transaction(self, client, alice):
        response = client.patch(
            '/transactions/999999/',
            json={'concept': 'X'},
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'X'},
        )
        assert response.status_code == 401

    def test_other_fields_unchanged_after_update(self, client, alice, transaction):
        transaction.refresh_from_db()
        original_amount = transaction.amount
        original_date = transaction.date

        client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'NEW NAME'},
            user=alice,
        )
        transaction.refresh_from_db()

        assert transaction.amount == original_amount
        assert transaction.date == original_date


# ── DELETE /transactions/{id}/ ────────────────────────────────────────────────


@pytest.mark.django_db
class TestDeleteTransaction:
    def test_deletes_transaction_successfully(self, client, alice, transaction):
        response = client.delete(
            f'/transactions/{transaction.id}/',
            user=alice,
        )
        assert response.status_code == 204

    def test_removes_from_database(self, client, alice, transaction):
        transaction_id = transaction.id
        client.delete(f'/transactions/{transaction_id}/', user=alice)
        assert not Transaction.objects.filter(pk=transaction_id).exists()

    def test_returns_403_for_non_member(self, client, bob, transaction):
        response = client.delete(
            f'/transactions/{transaction.id}/',
            user=bob,
        )
        assert response.status_code == 403
        assert Transaction.objects.filter(pk=transaction.id).exists()

    def test_returns_404_for_nonexistent_transaction(self, client, alice):
        response = client.delete(
            '/transactions/999999/',
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, transaction):
        response = client.delete(f'/transactions/{transaction.id}/')
        assert response.status_code == 401


# ── POST /api/v1/transactions/import ─────────────────────────────────────────


@pytest.mark.django_db
class TestImportTransactions:
    def test_successful_import(self, client, alice, account, csv_file, sample_dataframe, mocker):
        mock_handler = Mock()
        mock_handler.process.return_value = sample_dataframe
        mocker.patch.dict(
            'transactions.handlers.accounts.ACCOUNT_HANDLERS',
            {'sofi-savings': mock_handler},
        )
        mocker.patch(
            'api.v1.transactions.upsert_transactions',
            return_value={'inserted': 1, 'skipped': 0, 'total': 1},
        )

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file},
            user=alice,
        )

        assert response.status_code == 200
        data = response.json()
        assert data['filename'] == 'test.csv'
        assert data['inserted'] == 1
        assert data['skipped'] == 0
        assert data['total'] == 1
        assert data['error'] is None

    def test_returns_403_for_non_member(self, client, bob, account, csv_file):
        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file},
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_account(self, client, alice, csv_file):
        response = client.post(
            '/transactions/import?account_id=9999',
            FILES={'file': csv_file},
            user=alice,
        )
        assert response.status_code == 404

    def test_returns_error_for_missing_handler(self, client, alice, account, csv_file, mocker):
        mocker.patch.dict('transactions.handlers.accounts.ACCOUNT_HANDLERS', {}, clear=True)

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file},
            user=alice,
        )

        assert response.status_code == 200
        data = response.json()
        assert data['inserted'] == 0
        assert 'No handler found' in data['error']

    def test_returns_error_for_empty_dataframe(self, client, alice, account, csv_file, mocker):
        mock_handler = Mock()
        mock_handler.process.return_value = pd.DataFrame()
        mocker.patch.dict(
            'transactions.handlers.accounts.ACCOUNT_HANDLERS',
            {'sofi-savings': mock_handler},
        )

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file},
            user=alice,
        )

        assert response.status_code == 200
        assert 'no valid transactions' in response.json()['error'].lower()

    def test_handles_handler_exception(self, client, alice, account, csv_file, mocker):
        mock_handler = Mock()
        mock_handler.process.side_effect = Exception('Handler error')
        mocker.patch.dict(
            'transactions.handlers.accounts.ACCOUNT_HANDLERS',
            {'sofi-savings': mock_handler},
        )

        response = client.post(
            f'/transactions/import?account_id={account.id}',
            FILES={'file': csv_file},
            user=alice,
        )

        assert response.status_code == 200
        assert 'Handler error' in response.json()['error']
