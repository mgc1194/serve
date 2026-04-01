"""
tests/api/v1/test_pagination.py — Tests for transaction list pagination and sorting.
"""

import pytest
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
        username='alice', email='alice@example.com', password='Password1!'
    )


@pytest.fixture
def household(db, alice):
    h = Household.objects.create(name='Alice Household')
    h.users.add(alice)
    return h


@pytest.fixture
def account(db, household):
    at = AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)
    return Account.objects.create(name='Test Account', account_type=at, household=household)


def _tx(account, *, date, concept, amount, suffix=''):
    return Transaction.objects.create(
        dedupe_hash=f'hash_{date}_{concept}_{suffix}',
        date=date,
        concept=concept,
        amount=amount,
        account=account,
    )


@pytest.fixture
def fifty_five_transactions(db, account):
    """55 transactions across different dates for pagination testing."""
    txns = []
    for i in range(55):
        txns.append(
            _tx(
                account,
                date=f'2026-{str((i // 30) + 1).zfill(2)}-{str((i % 28) + 1).zfill(2)}',
                concept=f'TRANSACTION {i:02d}',
                amount=-(i + 1) * 10.0,
                suffix=str(i),
            )
        )
    return txns


# ── Response shape ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPaginatedResponseShape:
    def test_returns_paginated_schema(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='TEST', amount=-10.00)
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        data = response.json()
        assert 'results' in data
        assert 'count' in data
        assert 'next_cursor' in data
        assert 'previous_cursor' in data
        assert 'sort' in data
        assert 'sort_dir' in data

    def test_count_reflects_total_not_page(self, client, alice, household, fifty_five_transactions):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        data = response.json()
        assert data['count'] == 55
        assert len(data['results']) == 50

    def test_next_cursor_present_when_more_pages(
        self, client, alice, household, fifty_five_transactions
    ):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.json()['next_cursor'] is not None

    def test_next_cursor_null_on_last_page(self, client, alice, household, fifty_five_transactions):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        assert second['next_cursor'] is None

    def test_previous_cursor_null_on_first_page(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='TEST', amount=-10.00)
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.json()['previous_cursor'] is None

    def test_previous_cursor_present_on_second_page(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        assert second['previous_cursor'] is not None


# ── Pagination correctness ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPaginationCorrectness:
    def test_no_duplicate_rows_across_pages(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        first_ids = {t['id'] for t in first['results']}
        second_ids = {t['id'] for t in second['results']}
        assert first_ids.isdisjoint(second_ids)

    def test_all_rows_covered_across_pages(self, client, alice, household, fifty_five_transactions):
        all_ids = set()
        cursor = None
        while True:
            url = f'/transactions/?household_id={household.id}'
            if cursor:
                url += f'&cursor={cursor}'
            data = client.get(url, user=alice).json()
            all_ids.update(t['id'] for t in data['results'])
            cursor = data['next_cursor']
            if cursor is None:
                break
        assert len(all_ids) == 55

    def test_second_page_has_five_results(self, client, alice, household, fifty_five_transactions):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        assert len(second['results']) == 5

    def test_invalid_cursor_returns_400(self, client, alice, household):
        response = client.get(
            f'/transactions/?household_id={household.id}&cursor=notavalidcursor',
            user=alice,
        )
        assert response.status_code == 400


# ── Sorting ───────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSorting:
    def test_default_sort_is_date_descending(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='OLD', amount=-10.00, suffix='a')
        _tx(account, date='2026-03-01', concept='NEW', amount=-20.00, suffix='b')
        data = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        assert data['results'][0]['concept'] == 'NEW'
        assert data['results'][1]['concept'] == 'OLD'

    def test_sort_by_date_ascending(self, client, alice, household, account):
        _tx(account, date='2026-03-01', concept='NEW', amount=-20.00, suffix='a')
        _tx(account, date='2026-01-01', concept='OLD', amount=-10.00, suffix='b')
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=date&sort_dir=asc',
            user=alice,
        ).json()
        assert data['results'][0]['concept'] == 'OLD'

    def test_sort_by_amount_descending(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='SMALL', amount=-10.00, suffix='a')
        _tx(account, date='2026-01-02', concept='LARGE', amount=-100.00, suffix='b')
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=amount&sort_dir=desc',
            user=alice,
        ).json()
        # -10 > -100 so SMALL comes first in desc
        assert data['results'][0]['concept'] == 'SMALL'

    def test_sort_by_concept_ascending(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='ZEBRA', amount=-10.00, suffix='a')
        _tx(account, date='2026-01-02', concept='APPLE', amount=-20.00, suffix='b')
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=concept&sort_dir=asc',
            user=alice,
        ).json()
        assert data['results'][0]['concept'] == 'APPLE'

    def test_invalid_sort_dir_returns_400(self, client, alice, household):
        response = client.get(
            f'/transactions/?household_id={household.id}&sort_dir=sideways',
            user=alice,
        )
        assert response.status_code == 400

    def test_response_echoes_sort_and_dir(self, client, alice, household, account):
        _tx(account, date='2026-01-01', concept='TEST', amount=-10.00)
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=amount&sort_dir=asc',
            user=alice,
        ).json()
        assert data['sort'] == 'amount'
        assert data['sort_dir'] == 'asc'
