"""
tests/api/v1/categories/test_post.py — Tests for POST /categories/.

Root conftest provides: alice, household, other_household, category.
categories/conftest.py provides: client.
"""

import pytest

from tests.factories import CategoryFactory


@pytest.mark.django_db
class TestCreateCategory:
    def test_creates_category(self, client, alice, household):
        response = client.post(
            '/categories/',
            json={'name': 'Utilities', 'type': 'spending', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Utilities'
        assert response.json()['type'] == 'spending'
        assert response.json()['is_active'] is True

    def test_creates_earning_category(self, client, alice, household):
        response = client.post(
            '/categories/',
            json={'name': 'Salary', 'type': 'earning', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['type'] == 'earning'

    def test_same_name_different_type_does_not_collide(self, client, alice, household, category):
        # `category` fixture is a "Food" spending category — an "Food" earning
        # category is a distinct row, not a duplicate.
        response = client.post(
            '/categories/',
            json={'name': category.name, 'type': 'earning', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200

    def test_duplicate_active_name_and_type_returns_400(self, client, alice, household, category):
        response = client.post(
            '/categories/',
            json={'name': category.name, 'type': category.type, 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400

    def test_reactivates_soft_deleted_category(self, client, alice, household):
        inactive = CategoryFactory(
            name='Travel', type='spending', household=household, is_active=False
        )
        response = client.post(
            '/categories/',
            json={'name': 'Travel', 'type': 'spending', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == inactive.id
        assert data['is_active'] is True
        inactive.refresh_from_db()
        assert inactive.is_active is True

    def test_blank_name_returns_400(self, client, alice, household):
        response = client.post(
            '/categories/',
            json={'name': '  ', 'type': 'spending', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400

    def test_returns_403_for_non_member_household(self, client, alice, other_household):
        response = client.post(
            '/categories/',
            json={'name': 'Spy Category', 'type': 'spending', 'household_id': other_household.id},
            user=alice,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.post(
            '/categories/',
            json={'name': 'X', 'type': 'spending', 'household_id': 9999},
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.post(
            '/categories/',
            json={'name': 'X', 'type': 'spending', 'household_id': household.id},
        )
        assert response.status_code == 401
