"""
tests/api/v1/categories/test_get.py — Tests for GET /categories/.

Root conftest provides: alice, household, other_household, category.
categories/conftest.py provides: client.
"""

import pytest

from tests.factories import CategoryFactory


@pytest.mark.django_db
class TestListCategories:
    def test_returns_categories_for_users_households(self, client, alice, category):
        response = client.get('/categories/', user=alice)
        assert response.status_code == 200
        assert any(cat['id'] == category.id for cat in response.json())

    def test_does_not_return_categories_from_other_households(self, client, alice, other_household):
        CategoryFactory(name='Food', household=other_household)
        response = client.get('/categories/', user=alice)
        assert response.json() == []

    def test_filters_by_household_id(self, client, alice, household, category):
        response = client.get(f'/categories/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert all(cat['household_id'] == household.id for cat in response.json())

    def test_returns_403_if_household_belongs_to_other_user(self, client, alice, other_household):
        response = client.get(f'/categories/?household_id={other_household.id}', user=alice)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/categories/?household_id=9999', user=alice)
        assert response.status_code == 404

    def test_returns_empty_list_when_no_categories(self, client, alice, household):
        response = client.get('/categories/', user=alice)
        assert response.json() == []

    def test_excludes_inactive_categories_by_default(self, client, alice, household):
        inactive = CategoryFactory(name='Old', household=household, is_active=False)
        response = client.get('/categories/', user=alice)
        assert all(cat['id'] != inactive.id for cat in response.json())

    def test_include_inactive_returns_soft_deleted_categories(self, client, alice, household):
        inactive = CategoryFactory(name='Old', household=household, is_active=False)
        response = client.get('/categories/?include_inactive=true', user=alice)
        assert any(cat['id'] == inactive.id for cat in response.json())

    def test_unauthenticated_returns_401(self, client):
        response = client.get('/categories/')
        assert response.status_code == 401
