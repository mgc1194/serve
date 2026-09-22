"""
tests/api/v1/categories/test_delete.py — Tests for DELETE /categories/{id}/.

Root conftest provides: alice, seth, household, category.
categories/conftest.py provides: client.
"""

import pytest

from budgets.models import Category


@pytest.mark.django_db
class TestDeleteCategory:
    def test_soft_deletes_category(self, client, alice, category):
        cid = category.id
        response = client.delete(f'/categories/{cid}/', user=alice)
        assert response.status_code == 204
        category.refresh_from_db()
        assert category.is_active is False
        # Never hard-deleted — the row must still exist.
        assert Category.objects.filter(pk=cid).exists()

    def test_labels_keep_their_category_id_after_deactivation(self, client, alice, label, category):
        client.delete(f'/categories/{category.id}/', user=alice)
        label.refresh_from_db()
        assert label.category_id == category.id

    def test_returns_403_for_non_member(self, client, seth, category):
        response = client.delete(f'/categories/{category.id}/', user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_category(self, client, alice):
        response = client.delete('/categories/9999/', user=alice)
        assert response.status_code == 404
