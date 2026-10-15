"""
tests/api/v1/transactions/test_patch.py — Tests for PATCH /transactions/{id}/.

Covers: concept update, label assignment/removal, exclude_from_summary toggle,
and all relevant error cases.

Root conftest provides: alice, seth, household, account, label, other_label,
transaction, labeled_transaction.
transactions/conftest.py provides: client.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from transactions.models import Transaction


@pytest.mark.django_db
class TestUpdateTransaction:
    def test_updates_concept(self, client, alice, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'UPDATED CONCEPT'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['concept'] == 'UPDATED CONCEPT'

    def test_assigns_label(self, client, alice, transaction, label):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'label_id': label.id},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['label_id'] == label.id

    def test_clears_label_when_null(self, client, alice, labeled_transaction):
        response = client.patch(
            f'/transactions/{labeled_transaction.id}/',
            json={'label_id': None},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['label_id'] is None

    def test_rejects_label_from_other_household(self, client, alice, transaction, other_label):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'label_id': other_label.id},
            user=alice,
        )
        assert response.status_code == 400

    def test_sets_exclude_from_summary(self, client, alice, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'exclude_from_summary': True},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['exclude_from_summary'] is True

    def test_clears_exclude_from_summary(self, client, alice, transaction):
        # First exclude it
        client.patch(
            f'/transactions/{transaction.id}/',
            json={'exclude_from_summary': True},
            user=alice,
        )
        # Then re-include it
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'exclude_from_summary': False},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['exclude_from_summary'] is False

    def test_bumps_updated_at_even_with_only_one_field_changed(self, client, alice, transaction):
        # save(update_fields=...) silently skips auto_now fields unless
        # they're explicitly listed — exercise a single-field edit (the
        # narrowest update_fields list) to catch a regression there.
        yesterday = timezone.now() - timedelta(days=1)
        Transaction.objects.filter(pk=transaction.id).update(updated_at=yesterday)

        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'exclude_from_summary': True},
            user=alice,
        )
        assert response.status_code == 200

        transaction.refresh_from_db()
        assert transaction.updated_at > yesterday

    def test_returns_400_when_no_fields_provided(self, client, alice, transaction):
        response = client.patch(f'/transactions/{transaction.id}/', json={}, user=alice)
        assert response.status_code == 400

    def test_returns_403_for_non_member(self, client, seth, transaction):
        response = client.patch(
            f'/transactions/{transaction.id}/',
            json={'concept': 'X'},
            user=seth,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_transaction(self, client, alice):
        response = client.patch('/transactions/9999/', json={'concept': 'X'}, user=alice)
        assert response.status_code == 404
