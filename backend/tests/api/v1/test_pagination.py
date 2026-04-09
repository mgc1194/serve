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
    """55 transactions each on a unique date for pagination testing."""
    from datetime import date, timedelta

    start = date(2026, 1, 1)
    txns = []
    for i in range(55):
        txns.append(
            _tx(
                account,
                date=(start + timedelta(days=i)).isoformat(),
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
        assert len(data['results']) == 20

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
        third = client.get(
            f'/transactions/?household_id={household.id}&cursor={second["next_cursor"]}',
            user=alice,
        ).json()
        assert third['next_cursor'] is None

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

    def test_last_page_has_fifteen_results(self, client, alice, household, fifty_five_transactions):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        third = client.get(
            f'/transactions/?household_id={household.id}&cursor={second["next_cursor"]}',
            user=alice,
        ).json()
        assert len(third['results']) == 15


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

    def test_second_page_has_twenty_results(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        assert len(second['results']) == 20

    def test_invalid_cursor_returns_400(self, client, alice, household):
        response = client.get(
            f'/transactions/?household_id={household.id}&cursor=notavalidcursor',
            user=alice,
        )
        assert response.status_code == 400

    def test_both_cursors_returns_400(self, client, alice, household):
        response = client.get(
            f'/transactions/?household_id={household.id}&cursor=abc&previous_cursor=xyz',
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


# ── Backward navigation ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestBackwardNavigation:
    def test_previous_page_matches_first_page(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        back = client.get(
            f'/transactions/?household_id={household.id}&previous_cursor={second["previous_cursor"]}',
            user=alice,
        ).json()
        assert [t['id'] for t in back['results']] == [t['id'] for t in first['results']]

    def test_previous_cursor_null_after_navigating_back_to_first_page(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        # Navigate back from page 2 to page 1
        back = client.get(
            f'/transactions/?household_id={household.id}&previous_cursor={second["previous_cursor"]}',
            user=alice,
        ).json()
        # Page 1 has no previous page
        assert back['previous_cursor'] is None

    def test_back_two_pages_returns_first_page(
        self, client, alice, household, fifty_five_transactions
    ):
        first = client.get(f'/transactions/?household_id={household.id}', user=alice).json()
        second = client.get(
            f'/transactions/?household_id={household.id}&cursor={first["next_cursor"]}',
            user=alice,
        ).json()
        third = client.get(
            f'/transactions/?household_id={household.id}&cursor={second["next_cursor"]}',
            user=alice,
        ).json()
        back_to_second = client.get(
            f'/transactions/?household_id={household.id}&previous_cursor={third["previous_cursor"]}',
            user=alice,
        ).json()
        back_to_first = client.get(
            f'/transactions/?household_id={household.id}&previous_cursor={back_to_second["previous_cursor"]}',
            user=alice,
        ).json()
        assert [t['id'] for t in back_to_first['results']] == [t['id'] for t in first['results']]

    def test_no_rows_lost_navigating_forward_then_back(
        self, client, alice, household, fifty_five_transactions
    ):
        # Collect all IDs going forward
        forward_ids = []
        cursor = None
        while True:
            url = f'/transactions/?household_id={household.id}'
            if cursor:
                url += f'&cursor={cursor}'
            data = client.get(url, user=alice).json()
            forward_ids.extend(t['id'] for t in data['results'])
            cursor = data['next_cursor']
            if cursor is None:
                break

        # Collect all IDs going backward from the last page
        backward_ids = []
        prev = data['previous_cursor']
        while prev:
            url = f'/transactions/?household_id={household.id}&previous_cursor={prev}'
            data = client.get(url, user=alice).json()
            backward_ids.extend(t['id'] for t in data['results'])
            prev = data['previous_cursor']

        # Forward navigation must cover all 55 transactions with no duplicates
        assert len(set(forward_ids)) == 55
        # Backward navigation covers the first 40 (pages 1 and 2 of 3)
        # and must be a subset of the forward IDs with no duplicates
        assert len(backward_ids) == len(set(backward_ids))
        assert set(backward_ids).issubset(set(forward_ids))


# ── Nullable field sorting ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestNullableFieldSorting:
    @pytest.fixture
    def account_with_labels(self, db, household):
        from transactions.models import AccountType, Label

        at = AccountType.objects.get(handler_key=HandlerKeys.SOFI_SAVINGS)
        account = Account.objects.create(
            name='Label Test Account', account_type=at, household=household
        )
        label_a = Label.objects.create(name='AAA Label', color='#000000', household=household)
        label_z = Label.objects.create(name='ZZZ Label', color='#ffffff', household=household)
        # 3 unlabelled, 1 with AAA, 1 with ZZZ
        for i in range(3):
            Transaction.objects.create(
                dedupe_hash=f'unlabelled_{i}_' + 'x' * (64 - len(f'unlabelled_{i}_')),
                date='2026-01-01',
                concept=f'UNLABELLED {i}',
                amount=-10.00,
                account=account,
            )
        Transaction.objects.create(
            dedupe_hash='aaa_label_' + 'x' * 54,
            date='2026-01-02',
            concept='AAA TX',
            amount=-20.00,
            account=account,
            label=label_a,
        )
        Transaction.objects.create(
            dedupe_hash='zzz_label_' + 'x' * 54,
            date='2026-01-03',
            concept='ZZZ TX',
            amount=-30.00,
            account=account,
            label=label_z,
        )
        return account

    def test_unlabelled_transactions_included_in_label_sort(
        self, client, alice, household, account_with_labels
    ):
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=label&sort_dir=asc',
            user=alice,
        ).json()
        assert data['count'] == 5
        assert len(data['results']) == 5

    def test_unlabelled_sort_first_in_label_asc(
        self, client, alice, household, account_with_labels
    ):
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=label&sort_dir=asc',
            user=alice,
        ).json()
        results = data['results']
        # First 3 should be unlabelled
        assert all(r['label_id'] is None for r in results[:3])
        assert results[3]['label_name'] == 'AAA Label'
        assert results[4]['label_name'] == 'ZZZ Label'

    def test_unlabelled_sort_last_in_label_desc(
        self, client, alice, household, account_with_labels
    ):
        data = client.get(
            f'/transactions/?household_id={household.id}&sort=label&sort_dir=desc',
            user=alice,
        ).json()
        results = data['results']
        assert results[0]['label_name'] == 'ZZZ Label'
        assert results[1]['label_name'] == 'AAA Label'
        assert all(r['label_id'] is None for r in results[2:])

    def test_pagination_across_label_sort_covers_all_rows(
        self, client, alice, household, account_with_labels
    ):
        all_ids = set()
        cursor = None
        while True:
            url = f'/transactions/?household_id={household.id}&sort=label&sort_dir=asc'
            if cursor:
                url += f'&cursor={cursor}'
            data = client.get(url, user=alice).json()
            all_ids.update(t['id'] for t in data['results'])
            cursor = data['next_cursor']
            if cursor is None:
                break
        assert len(all_ids) == 5
