"""
tests/api/v1/labels/test_patch.py — Tests for PATCH /labels/{id}/.

Root conftest provides: alice, seth, household, label.
labels/conftest.py provides: client.
"""

import pytest

from tests.factories import CategoryFactory, LabelFactory


@pytest.mark.django_db
class TestUpdateLabel:
    def test_updates_name(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={'name': 'Supermarket'}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'Supermarket'

    def test_updates_color(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={'color': '#00FF00'}, user=alice)
        assert response.status_code == 200
        assert response.json()['color'] == '#00FF00'

    def test_updates_category(self, client, alice, household, label):
        category = CategoryFactory(name='Essentials', household=household)
        response = client.patch(
            f'/labels/{label.id}/', json={'category_id': category.id}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['category_id'] == category.id

    def test_clears_category(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={'category_id': None}, user=alice)
        assert response.status_code == 200
        assert response.json()['category_id'] is None

    def test_category_from_other_household_returns_400(self, client, alice, other_household, label):
        other_category = CategoryFactory(name='Essentials', household=other_household)
        response = client.patch(
            f'/labels/{label.id}/', json={'category_id': other_category.id}, user=alice
        )
        assert response.status_code == 400

    def test_unspecified_fields_are_unchanged(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={'color': '#00FF00'}, user=alice)
        data = response.json()
        assert data['name'] == label.name
        assert data['category_id'] == label.category_id

    def test_persists_to_database(self, client, alice, label):
        client.patch(f'/labels/{label.id}/', json={'name': 'Supermarket'}, user=alice)
        label.refresh_from_db()
        assert label.name == 'Supermarket'

    def test_no_fields_provided_returns_400(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={}, user=alice)
        assert response.status_code == 400
        assert 'at least one field' in response.json()['detail'].lower()

    def test_blank_name_returns_400(self, client, alice, label):
        response = client.patch(f'/labels/{label.id}/', json={'name': '   '}, user=alice)
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_duplicate_name_returns_400(self, client, alice, household, label):
        other = LabelFactory(name='Transport', household=household)
        response = client.patch(f'/labels/{label.id}/', json={'name': other.name}, user=alice)
        assert response.status_code == 400

    def test_returns_403_for_non_member(self, client, seth, label):
        response = client.patch(f'/labels/{label.id}/', json={'name': 'X'}, user=seth)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_label(self, client, alice):
        response = client.patch('/labels/9999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404
