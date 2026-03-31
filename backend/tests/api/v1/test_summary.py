"""
tests/test_summary.py — Integration tests for GET /api/v1/summary/.
"""

import pytest
from django.test import Client

from transactions.models import Account, AccountType, Bank, Label, Transaction
from users.models import CustomUser, Household

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def household(db):
    return Household.objects.create(name='Test Household')


@pytest.fixture
def other_household(db):
    return Household.objects.create(name='Other Household')


@pytest.fixture
def user(db, household):
    u = CustomUser.objects.create_user(
        username='test@example.com',
        email='test@example.com',
        password='password123',
    )
    u.households.add(household)
    return u


@pytest.fixture
def other_user(db, other_household):
    u = CustomUser.objects.create_user(
        username='other@example.com',
        email='other@example.com',
        password='password123',
    )
    u.households.add(other_household)
    return u


@pytest.fixture
def bank(db):
    return Bank.objects.create(name='Test Bank')


@pytest.fixture
def account_type(db, bank):
    return AccountType.objects.create(
        name='Savings',
        handler_key='sofi_savings',
        bank=bank,
    )


@pytest.fixture
def account(db, account_type, household):
    return Account.objects.create(
        name='Test Savings',
        account_type=account_type,
        household=household,
    )


@pytest.fixture
def food_label(db, household):
    return Label.objects.create(
        name='Groceries', color='#16a34a', category='Food', household=household
    )


@pytest.fixture
def transport_label(db, household):
    return Label.objects.create(
        name='Gas', color='#2563eb', category='Transport', household=household
    )


@pytest.fixture
def earnings_label(db, household):
    return Label.objects.create(
        name='Paycheck', color='#059669', category='Earnings', household=household
    )


@pytest.fixture
def no_category_label(db, household):
    return Label.objects.create(
        name='Miscellaneous', color='#6B7280', category='', household=household
    )


@pytest.fixture
def auth_client(db, user):
    client = Client()
    client.login(username='test@example.com', password='password123')
    return client


def _tx(account, amount, label=None, date='2026-03-15', concept='TEST', suffix=''):
    return Transaction.objects.create(
        dedupe_hash=f'hash_{amount}_{label}_{date}_{suffix}',
        date=date,
        concept=concept,
        amount=amount,
        account=account,
        label=label,
    )


# ── Basic behaviour ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryBasic:
    def test_returns_200_for_member(self, auth_client, household):
        response = auth_client.get(f'/api/v1/summary/?household_id={household.id}')
        assert response.status_code == 200

    def test_403_for_non_member(self, auth_client, other_household):
        response = auth_client.get(f'/api/v1/summary/?household_id={other_household.id}')
        assert response.status_code == 403

    def test_404_for_missing_household(self, auth_client):
        response = auth_client.get('/api/v1/summary/?household_id=99999')
        assert response.status_code == 404

    def test_401_for_unauthenticated(self, household):
        response = Client().get(f'/api/v1/summary/?household_id={household.id}')
        assert response.status_code == 401

    def test_empty_household_returns_zero_totals(self, auth_client, household):
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['total'] == 0.0
        assert data['balance'] == 0.0
        assert data['uncategorised_total'] == 0.0
        assert data['earnings'] == []
        assert data['spending'] == []

    def test_400_for_invalid_month(self, auth_client, household):
        response = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=bad')
        assert response.status_code == 400

    def test_400_for_month_with_invalid_number(self, auth_client, household):
        response = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-13')
        assert response.status_code == 400


# ── Aggregation ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryAggregation:
    def test_spending_label_appears_in_spending(self, auth_client, account, household, food_label):
        _tx(account, -42.57, food_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert len(data['spending']) == 1
        assert data['spending'][0]['category'] == 'Food'
        assert data['spending'][0]['labels'][0]['label_name'] == 'Groceries'
        assert data['spending'][0]['labels'][0]['total'] == pytest.approx(-42.57)
        assert data['earnings'] == []

    def test_earnings_label_appears_in_earnings(
        self, auth_client, account, household, earnings_label
    ):
        _tx(account, 2000.00, earnings_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert len(data['earnings']) == 1
        assert data['earnings'][0]['labels'][0]['label_name'] == 'Paycheck'
        assert data['earnings'][0]['labels'][0]['total'] == pytest.approx(2000.00)
        assert data['spending'] == []

    def test_unlabelled_transactions_count_in_uncategorised(self, auth_client, account, household):
        _tx(account, -15.00)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['uncategorised_total'] == pytest.approx(-15.00)
        assert data['spending'] == []

    def test_multiple_transactions_same_label_are_summed(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, suffix='a')
        _tx(account, -20.00, food_label, suffix='b')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        total = data['spending'][0]['labels'][0]['total']
        assert total == pytest.approx(-30.00)

    def test_total_equals_sum_of_all_labelled_and_unlabelled(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -50.00, food_label)
        _tx(account, -10.00)  # unlabelled
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['total'] == pytest.approx(-60.00)
        assert data['balance'] == data['total']

    def test_label_without_category_appears_in_uncategorised_bucket(
        self, auth_client, account, household, no_category_label
    ):
        _tx(account, -5.00, no_category_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        category_row = data['spending'][0]
        assert category_row['category'] == ''

    def test_categories_sorted_alphabetically_uncategorised_last(
        self, auth_client, account, household, food_label, transport_label, no_category_label
    ):
        _tx(account, -10.00, food_label, suffix='f')
        _tx(account, -20.00, transport_label, suffix='t')
        _tx(account, -5.00, no_category_label, suffix='m')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        categories = [row['category'] for row in data['spending']]
        assert categories == ['Food', 'Transport', '']


# ── Month filter ──────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryMonthFilter:
    def test_month_filter_includes_transactions_in_month(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, date='2026-03-01')
        _tx(account, -20.00, food_label, date='2026-03-31', suffix='2')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-03').json()
        assert data['spending'][0]['labels'][0]['total'] == pytest.approx(-30.00)

    def test_month_filter_excludes_other_months(self, auth_client, account, household, food_label):
        _tx(account, -10.00, food_label, date='2026-02-15', suffix='feb')
        _tx(account, -20.00, food_label, date='2026-03-15', suffix='mar')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-03').json()
        assert data['spending'][0]['labels'][0]['total'] == pytest.approx(-20.00)

    def test_no_month_returns_all_time_totals(self, auth_client, account, household, food_label):
        _tx(account, -10.00, food_label, date='2025-01-01', suffix='old')
        _tx(account, -20.00, food_label, date='2026-03-01', suffix='new')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['spending'][0]['labels'][0]['total'] == pytest.approx(-30.00)

    def test_month_filter_empty_month_returns_zero(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, date='2026-03-01')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-04').json()
        assert data['spending'] == []
        assert data['total'] == 0.0


# ── Tenant isolation ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryTenantIsolation:
    def test_other_household_transactions_not_included(
        self, auth_client, account, household, other_household, food_label, bank
    ):
        # Create a second account in the other household
        at2 = AccountType.objects.create(name='Other', handler_key='other_key', bank=bank)
        acc2 = Account.objects.create(
            name='Other Account', account_type=at2, household=other_household
        )
        other_label = Label.objects.create(
            name='Groceries', color='#000000', category='Food', household=other_household
        )
        _tx(account, -10.00, food_label, suffix='mine')
        _tx(acc2, -999.00, other_label, suffix='theirs')

        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        # Only our transaction should appear
        label_total = data['spending'][0]['labels'][0]['total']
        assert label_total == pytest.approx(-10.00)


# ── earliest_transaction_date ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryEarliestDate:
    def test_returns_none_when_no_transactions(self, auth_client, household):
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['earliest_transaction_date'] is None

    def test_returns_iso_date_of_oldest_transaction(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, date='2025-06-01', suffix='old')
        _tx(account, -20.00, food_label, date='2026-03-01', suffix='new')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['earliest_transaction_date'] == '2025-06-01'

    def test_earliest_date_is_unaffected_by_month_filter(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, date='2025-01-15', suffix='old')
        _tx(account, -20.00, food_label, date='2026-03-15', suffix='new')
        # Filter to March 2026 — earliest date should still reflect January 2025
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-03').json()
        assert data['earliest_transaction_date'] == '2025-01-15'

    def test_earliest_date_scoped_to_household(
        self, auth_client, account, household, other_household, food_label, bank
    ):
        at2 = AccountType.objects.create(name='Other2', handler_key='other_key2', bank=bank)
        acc2 = Account.objects.create(
            name='Other Account2', account_type=at2, household=other_household
        )
        other_label = Label.objects.create(
            name='Groceries', color='#000000', category='Food', household=other_household
        )
        # Other household has an older transaction
        _tx(acc2, -10.00, other_label, date='2020-01-01', suffix='other')
        _tx(account, -20.00, food_label, date='2026-03-01', suffix='mine')

        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        # Should reflect our household only, not the other household's 2020 date
        assert data['earliest_transaction_date'] == '2026-03-01'
