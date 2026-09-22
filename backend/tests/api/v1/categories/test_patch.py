"""
tests/api/v1/categories/test_patch.py — Tests for PATCH /categories/{id}/.

Root conftest provides: alice, seth, household, category.
categories/conftest.py provides: client.
"""

import pytest

from tests.factories import CategoryFactory


@pytest.mark.django_db
class TestUpdateCategory:
    def test_updates_name(self, client, alice, category):
        response = client.patch(
            f'/categories/{category.id}/', json={'name': 'Groceries'}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Groceries'

    def test_deactivates_via_is_active(self, client, alice, category):
        response = client.patch(
            f'/categories/{category.id}/', json={'is_active': False}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['is_active'] is False

    def test_reactivates_via_is_active(self, client, alice, household):
        inactive = CategoryFactory(name='Old', household=household, is_active=False)
        response = client.patch(f'/categories/{inactive.id}/', json={'is_active': True}, user=alice)
        assert response.status_code == 200
        assert response.json()['is_active'] is True

    def test_type_cannot_be_changed(self, client, alice, category):
        # The schema has no `type` field at all — an extra field in the body
        # is simply ignored, not rejected, matching ninja's default behavior.
        response = client.patch(
            f'/categories/{category.id}/',
            json={'name': category.name, 'type': 'earning'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['type'] == category.type

    def test_unspecified_fields_are_unchanged(self, client, alice, category):
        response = client.patch(
            f'/categories/{category.id}/', json={'is_active': False}, user=alice
        )
        data = response.json()
        assert data['name'] == category.name
        assert data['type'] == category.type

    def test_persists_to_database(self, client, alice, category):
        client.patch(f'/categories/{category.id}/', json={'name': 'Groceries'}, user=alice)
        category.refresh_from_db()
        assert category.name == 'Groceries'

    def test_no_fields_provided_returns_400(self, client, alice, category):
        response = client.patch(f'/categories/{category.id}/', json={}, user=alice)
        assert response.status_code == 400
        assert 'at least one field' in response.json()['detail'].lower()

    def test_blank_name_returns_400(self, client, alice, category):
        response = client.patch(f'/categories/{category.id}/', json={'name': '   '}, user=alice)
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_duplicate_name_and_type_returns_400(self, client, alice, household, category):
        other = CategoryFactory(name='Transport', type=category.type, household=household)
        response = client.patch(
            f'/categories/{category.id}/', json={'name': other.name}, user=alice
        )
        assert response.status_code == 400

    def test_same_name_different_type_does_not_collide(self, client, alice, household, category):
        other = CategoryFactory(name='Transport', type='earning', household=household)
        response = client.patch(
            f'/categories/{category.id}/', json={'name': other.name}, user=alice
        )
        assert response.status_code == 200

    def test_returns_403_for_non_member(self, client, seth, category):
        response = client.patch(f'/categories/{category.id}/', json={'name': 'X'}, user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_category(self, client, alice):
        response = client.patch('/categories/9999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404
