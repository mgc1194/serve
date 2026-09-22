"""
tests/api/v1/transactions/test_get.py — Tests for GET /transactions/.

Covers: basic list behaviour, pagination (cursor-based), and sorting
(including nullable-field coalescing).

Root conftest provides: alice, seth, household, other_household, account_type,
account, label, transaction, labeled_transaction.
transactions/conftest.py provides: client, make_tx.
"""

import pytest

from tests.api.v1.transactions.conftest import make_tx
from tests.factories import AccountFactory, LabelFactory, TransactionFactory

# ── GET /transactions/ — basic list ──────────────────────────────────────────


@pytest.mark.django_db
class TestListTransactions:
    def test_returns_transactions_for_household(self, client, alice, transaction, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        data = response.json()['results']
        assert len(data) == 1
        assert data[0]['id'] == transaction.id

    def test_returns_empty_for_household_with_no_transactions(self, client, alice, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert response.json()['results'] == []

    def test_includes_label_fields_when_present(
        self, client, alice, labeled_transaction, label, household
    ):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        data = response.json()['results'][0]
        assert data['label_id'] == label.id
        assert data['label_name'] == label.name
        assert data['label_color'] == label.color

    def test_results_ordered_by_date_descending(self, client, alice, account, household):
        TransactionFactory(account=account, date='2026-01-01', concept='OLDER', amount=-10.00)
        TransactionFactory(account=account, date='2026-01-15', concept='NEWER', amount=-20.00)

        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        data = response.json()['results']
        assert data[0]['concept'] == 'NEWER'
        assert data[1]['concept'] == 'OLDER'

    def test_unauthenticated_returns_401(self, client, household):
        response = client.get(f'/transactions/?household_id={household.id}')
        assert response.status_code == 401

    def test_returns_403_for_non_member(self, client, seth, household):
        response = client.get(f'/transactions/?household_id={household.id}', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/transactions/?household_id=9999', user=alice)
        assert response.status_code == 404


# ── GET /transactions/ — label filter ────────────────────────────────────────


@pytest.mark.django_db
class TestLabelFilter:
    def test_filters_to_transactions_with_the_given_label(
        self, client, alice, account, household, label
    ):
        TransactionFactory(account=account, date='2026-01-01', concept='UNLABELLED', amount=-5.00)
        TransactionFactory(
            account=account, date='2026-01-02', concept='LABELLED', amount=-10.00, label=label
        )

        response = client.get(
            f'/transactions/?household_id={household.id}&label_id={label.id}', user=alice
        )
        data = response.json()['results']
        assert len(data) == 1
        assert data[0]['concept'] == 'LABELLED'

    def test_returns_empty_when_no_transactions_have_the_label(
        self, client, alice, account, household, label
    ):
        TransactionFactory(account=account, date='2026-01-01', concept='UNLABELLED', amount=-5.00)

        response = client.get(
            f'/transactions/?household_id={household.id}&label_id={label.id}', user=alice
        )
        assert response.json()['results'] == []

    def test_label_id_negative_one_filters_to_unlabelled_transactions(
        self, client, alice, account, household, label
    ):
        TransactionFactory(account=account, date='2026-01-01', concept='UNLABELLED', amount=-5.00)
        TransactionFactory(
            account=account, date='2026-01-02', concept='LABELLED', amount=-10.00, label=label
        )

        response = client.get(f'/transactions/?household_id={household.id}&label_id=-1', user=alice)
        data = response.json()['results']
        assert len(data) == 1
        assert data[0]['concept'] == 'UNLABELLED'


# ── GET /transactions/ — pagination ──────────────────────────────────────────


@pytest.fixture
def pagination_account(db, account_type, household):
    """Dedicated account used only by pagination tests."""
    return AccountFactory(name='Pagination Account', account_type=account_type, household=household)


@pytest.fixture
def fifty_five_transactions(db, pagination_account):
    """55 transactions each on a unique date for pagination testing."""
    from datetime import date, timedelta

    base = date(2026, 1, 1)
    return [
        make_tx(
            pagination_account,
            date=base + timedelta(days=i),
            concept=f'TX {i}',
            amount=-float(i + 1),
        )
        for i in range(55)
    ]


@pytest.mark.django_db
class TestPaginationCorrectness:
    def test_default_page_size_is_20(self, client, alice, household, fifty_five_transactions):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert len(response.json()['results']) == 20

    def test_next_cursor_present_when_more_results(
        self, client, alice, household, fifty_five_transactions
    ):
        response = client.get(f'/transactions/?household_id={household.id}', user=alice)
        assert response.json()['next_cursor'] is not None

    def test_next_cursor_absent_on_last_page(
        self, client, alice, household, fifty_five_transactions
    ):
        cursor = None
        data = None
        for _ in range(10):  # safety ceiling: 10 * 20 > 55
            url = f'/transactions/?household_id={household.id}'
            if cursor:
                url += f'&cursor={cursor}'
            data = client.get(url, user=alice).json()
            cursor = data['next_cursor']
            if cursor is None:
                break
        else:
            pytest.fail('next_cursor never became None after exhausting all pages')
        assert data['next_cursor'] is None

    def test_full_forward_backward_traversal(
        self, client, alice, household, fifty_five_transactions
    ):
        forward_ids = []
        cursor = None
        data = None
        for _ in range(10):
            url = f'/transactions/?household_id={household.id}'
            if cursor:
                url += f'&cursor={cursor}'
            data = client.get(url, user=alice).json()
            forward_ids.extend(t['id'] for t in data['results'])
            cursor = data['next_cursor']
            if cursor is None:
                break
        else:
            pytest.fail('Forward traversal did not terminate within page limit')

        backward_ids = []
        prev = data['previous_cursor']
        for _ in range(10):
            if prev is None:
                break
            url = f'/transactions/?household_id={household.id}&previous_cursor={prev}'
            data = client.get(url, user=alice).json()
            backward_ids.extend(t['id'] for t in data['results'])
            prev = data['previous_cursor']

        assert len(set(forward_ids)) == 55
        assert len(backward_ids) == len(set(backward_ids))
        assert set(backward_ids).issubset(set(forward_ids))


# ── GET /transactions/ — sorting ─────────────────────────────────────────────


@pytest.fixture
def account_with_labels(db, household, account_type):
    acct = AccountFactory(name='Label Test Account', account_type=account_type, household=household)
    label_a = LabelFactory(name='AAA Label', color='#000000', household=household)
    label_z = LabelFactory(name='ZZZ Label', color='#ffffff', household=household)
    for i in range(3):
        TransactionFactory(
            account=acct,
            date='2026-01-01',
            concept=f'UNLABELLED {i}',
            amount=-10.00,
        )
    TransactionFactory(
        account=acct, date='2026-01-02', concept='AAA TX', amount=-20.00, label=label_a
    )
    TransactionFactory(
        account=acct, date='2026-01-03', concept='ZZZ TX', amount=-30.00, label=label_z
    )
    return acct


@pytest.mark.django_db
class TestSorting:
    def test_sort_by_label_asc_puts_nulls_first(
        self, client, alice, household, account_with_labels
    ):
        url = f'/transactions/?household_id={household.id}&sort=label&sort_dir=asc'
        response = client.get(url, user=alice)
        results = response.json()['results']
        names = [r['label_name'] for r in results]
        non_null = [n for n in names if n is not None]
        last_null_idx = max(i for i, n in enumerate(names) if n is None)
        first_label_idx = names.index(non_null[0])
        assert last_null_idx < first_label_idx
        assert non_null == sorted(non_null)

    def test_sort_by_label_desc_puts_nulls_last(
        self, client, alice, household, account_with_labels
    ):
        url = f'/transactions/?household_id={household.id}&sort=label&sort_dir=desc'
        response = client.get(url, user=alice)
        results = response.json()['results']
        names = [r['label_name'] for r in results]
        non_null = [n for n in names if n is not None]
        first_null_idx = next(i for i, n in enumerate(names) if n is None)
        last_label_idx = max(i for i, n in enumerate(names) if n is not None)
        assert last_label_idx < first_null_idx
        assert non_null == sorted(non_null, reverse=True)
