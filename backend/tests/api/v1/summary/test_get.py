"""
tests/api/v1/summary/test_get.py — Integration tests for GET /api/v1/summary/.

Covers: access control, aggregation, month filter, exclude_from_summary filter,
and earliest_transaction_date.

summary/conftest.py provides: user, other_user, account, food_label,
income_label, transport_label, earnings_label, no_category_label, auth_client,
and the _tx() helper.
Root conftest provides: household, other_household, account_type.
"""

import pytest
from django.test import Client

from tests.api.v1.summary.conftest import _tx
from tests.factories import AccountFactory, CategoryFactory, LabelFactory

# ── Basic access ──────────────────────────────────────────────────────────────


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
        assert data['spending'][0]['category_name'] == 'Food'
        assert data['spending'][0]['labels'][0]['label_name'] == 'Groceries'

    def test_earnings_label_appears_in_earnings(
        self, auth_client, account, household, earnings_label
    ):
        _tx(account, 2500.00, earnings_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert len(data['earnings']) == 1
        assert data['earnings'][0]['category_name'] == 'Earnings'

    def test_unlabelled_transaction_goes_to_uncategorised(self, auth_client, account, household):
        _tx(account, -15.00)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['uncategorised_total'] == pytest.approx(-15.00)

    def test_total_is_sum_of_all_spending(
        self, auth_client, account, household, food_label, transport_label
    ):
        _tx(account, -42.57, food_label, suffix='1')
        _tx(account, -20.00, transport_label, suffix='2')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['total'] == pytest.approx(-62.57)

    def test_income_label_excluded_from_spending_total(
        self, auth_client, account, household, income_label
    ):
        _tx(account, 1000.00, income_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['spending'] == []
        assert data['total'] == pytest.approx(1000.00)

    def test_other_household_transactions_not_included(
        self, auth_client, other_household, household, account_type, food_label
    ):
        other_account = AccountFactory(
            name='Other Account', account_type=account_type, household=other_household
        )
        other_category = CategoryFactory(name='Food', household=other_household)
        other_label = LabelFactory(
            name='Groceries', category=other_category, household=other_household
        )
        _tx(other_account, -100.00, other_label)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['total'] == 0.0

    def test_month_filter_excludes_other_months(self, auth_client, account, household, food_label):
        _tx(account, -10.00, food_label, date='2026-02-15', suffix='feb')
        _tx(account, -20.00, food_label, date='2026-03-15', suffix='mar')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-03').json()
        assert data['total'] == pytest.approx(-20.00)


# ── exclude_from_summary filter ───────────────────────────────────────────────


@pytest.mark.django_db
class TestSummaryExcludeFilter:
    def test_excluded_transaction_omitted_from_total(
        self, auth_client, account, household, food_label
    ):
        from transactions.models import Transaction

        tx = _tx(account, -50.00, food_label)
        Transaction.objects.filter(pk=tx.pk).update(exclude_from_summary=True)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['total'] == 0.0
        assert data['spending'] == []

    def test_excluded_transaction_not_in_uncategorised(self, auth_client, account, household):
        from transactions.models import Transaction

        tx = _tx(account, -25.00)
        Transaction.objects.filter(pk=tx.pk).update(exclude_from_summary=True)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['uncategorised_total'] == 0.0


# ── earliest_transaction_date ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestEarliestTransactionDate:
    def test_returns_none_when_no_transactions(self, auth_client, household):
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['earliest_transaction_date'] is None

    def test_returns_date_of_oldest_transaction(self, auth_client, account, household, food_label):
        _tx(account, -10.00, food_label, date='2025-06-01', suffix='old')
        _tx(account, -20.00, food_label, date='2026-03-01', suffix='new')
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['earliest_transaction_date'] == '2025-06-01'

    def test_earliest_date_unaffected_by_month_filter(
        self, auth_client, account, household, food_label
    ):
        _tx(account, -10.00, food_label, date='2025-06-01', suffix='old')
        _tx(account, -20.00, food_label, date='2026-03-01', suffix='new')
        # Filter to March 2026 only — earliest date should still reflect 2025-06-01
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}&month=2026-03').json()
        assert data['earliest_transaction_date'] == '2025-06-01'

    def test_excluded_transactions_still_count_toward_earliest(
        self, auth_client, account, household, food_label
    ):
        from transactions.models import Transaction

        tx = _tx(account, -50.00, food_label, date='2024-01-01', suffix='excluded')
        Transaction.objects.filter(pk=tx.pk).update(exclude_from_summary=True)
        data = auth_client.get(f'/api/v1/summary/?household_id={household.id}').json()
        assert data['earliest_transaction_date'] == '2024-01-01'
