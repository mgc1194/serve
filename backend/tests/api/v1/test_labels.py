"""
tests/api/v1/test_labels.py — Tests for label management endpoints.
"""

import pytest
from ninja.testing import TestClient

from api.v1.labels import router
from transactions.models import Label
from users.models import CustomUser, Household

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def client():
    return TestClient(router)


@pytest.fixture
def alice(db):
    return CustomUser.objects.create_user(
        username='alice',
        email='alice@example.com',
        password='Password1!',
    )


@pytest.fixture
def bob(db):
    return CustomUser.objects.create_user(
        username='bob',
        email='bob@example.com',
        password='Password1!',
    )


@pytest.fixture
def household(db, alice):
    h = Household.objects.create(name='Alice Household')
    h.users.add(alice)
    return h


@pytest.fixture
def other_household(db, bob):
    h = Household.objects.create(name='Bob Household')
    h.users.add(bob)
    return h


@pytest.fixture
def label(db, household):
    return Label.objects.create(
        name='Groceries',
        color='#FF5733',
        category='Food',
        household=household,
    )


# ── GET /labels/ ──────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestListLabels:
    def test_returns_labels_for_users_households(self, client, alice, label):
        response = client.get('/labels/', user=alice)
        assert response.status_code == 200
        assert any(lbl['id'] == label.id for lbl in response.json())

    def test_does_not_return_labels_from_other_households(self, client, alice, other_household):
        Label.objects.create(name='Groceries', household=other_household)
        response = client.get('/labels/', user=alice)
        names = [lbl['name'] for lbl in response.json()]
        assert 'Groceries' not in names

    def test_filters_by_household_id(self, client, alice, household, label):
        response = client.get(f'/labels/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        assert all(lbl['household_id'] == household.id for lbl in response.json())

    def test_returns_403_if_household_belongs_to_other_user(self, client, alice, other_household):
        response = client.get(f'/labels/?household_id={other_household.id}', user=alice)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/labels/?household_id=9999', user=alice)
        assert response.status_code == 404

    def test_returns_empty_list_when_no_labels(self, client, alice):
        response = client.get('/labels/', user=alice)
        assert response.status_code == 200
        assert response.json() == []

    def test_unauthenticated_returns_401(self, client):
        response = client.get('/labels/')
        assert response.status_code == 401

    def test_response_shape(self, client, alice, label):
        response = client.get('/labels/', user=alice)
        item = response.json()[0]
        assert set(item.keys()) == {'id', 'name', 'color', 'category', 'household_id'}


# ── POST /labels/ ─────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreateLabel:
    def test_creates_label_successfully(self, client, alice, household):
        response = client.post(
            '/labels/',
            json={'name': 'Restaurants', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Restaurants'

    def test_persists_to_database(self, client, alice, household):
        client.post(
            '/labels/',
            json={'name': 'Restaurants', 'household_id': household.id},
            user=alice,
        )
        assert Label.objects.filter(name='Restaurants', household=household).exists()

    def test_color_defaults_to_grey(self, client, alice, household):
        response = client.post(
            '/labels/',
            json={'name': 'Restaurants', 'household_id': household.id},
            user=alice,
        )
        assert response.json()['color'] == '#6B7280'

    def test_category_defaults_to_empty_string(self, client, alice, household):
        response = client.post(
            '/labels/',
            json={'name': 'Restaurants', 'household_id': household.id},
            user=alice,
        )
        assert response.json()['category'] == ''

    def test_custom_color_and_category_are_saved(self, client, alice, household):
        response = client.post(
            '/labels/',
            json={
                'name': 'Restaurants',
                'color': '#FF5733',
                'category': 'Food',
                'household_id': household.id,
            },
            user=alice,
        )
        data = response.json()
        assert data['color'] == '#FF5733'
        assert data['category'] == 'Food'

    def test_blank_name_returns_400(self, client, alice, household):
        response = client.post(
            '/labels/',
            json={'name': '   ', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_duplicate_name_in_same_household_returns_400(self, client, alice, household, label):
        response = client.post(
            '/labels/',
            json={'name': 'Groceries', 'household_id': household.id},
            user=alice,
        )
        assert response.status_code == 400
        assert 'already exists' in response.json()['detail'].lower()

    def test_same_name_in_different_household_is_allowed(
        self, client, alice, bob, household, other_household
    ):
        other_household.users.add(alice)
        response = client.post(
            '/labels/',
            json={'name': 'Groceries', 'household_id': other_household.id},
            user=alice,
        )
        assert response.status_code == 200

    def test_returns_403_if_not_a_member(self, client, bob, household):
        response = client.post(
            '/labels/',
            json={'name': 'Groceries', 'household_id': household.id},
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.post(
            '/labels/',
            json={'name': 'Groceries', 'household_id': 9999},
            user=alice,
        )
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.post(
            '/labels/',
            json={'name': 'Groceries', 'household_id': household.id},
        )
        assert response.status_code == 401


# ── PATCH /labels/{id}/ ───────────────────────────────────────────────────────


@pytest.mark.django_db
class TestUpdateLabel:
    def test_updates_name(self, client, alice, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'name': 'Supermarket'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Supermarket'

    def test_updates_color(self, client, alice, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'color': '#00FF00'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['color'] == '#00FF00'

    def test_updates_category(self, client, alice, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'category': 'Essentials'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['category'] == 'Essentials'

    def test_unspecified_fields_are_unchanged(self, client, alice, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'color': '#00FF00'},
            user=alice,
        )
        data = response.json()
        assert data['name'] == label.name
        assert data['category'] == label.category

    def test_persists_to_database(self, client, alice, label):
        client.patch(f'/labels/{label.id}/', json={'name': 'Supermarket'}, user=alice)
        label.refresh_from_db()
        assert label.name == 'Supermarket'

    def test_blank_name_returns_400(self, client, alice, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'name': '   '},
            user=alice,
        )
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_duplicate_name_returns_400(self, client, alice, household, label):
        Label.objects.create(name='Restaurants', household=household)
        response = client.patch(
            f'/labels/{label.id}/',
            json={'name': 'Restaurants'},
            user=alice,
        )
        assert response.status_code == 400
        assert 'already exists' in response.json()['detail'].lower()

    def test_returns_403_if_not_a_member(self, client, bob, label):
        response = client.patch(
            f'/labels/{label.id}/',
            json={'name': 'Hacked'},
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_label(self, client, alice):
        response = client.patch('/labels/9999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, label):
        response = client.patch(f'/labels/{label.id}/', json={'name': 'X'})
        assert response.status_code == 401


# ── DELETE /labels/{id}/ ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestDeleteLabel:
    def test_deletes_label_successfully(self, client, alice, label):
        response = client.delete(f'/labels/{label.id}/', user=alice)
        assert response.status_code == 204
        assert not Label.objects.filter(pk=label.id).exists()

    def test_returns_403_if_not_a_member(self, client, bob, label):
        response = client.delete(f'/labels/{label.id}/', user=bob)
        assert response.status_code == 403
        assert Label.objects.filter(pk=label.id).exists()

    def test_returns_404_for_nonexistent_label(self, client, alice):
        response = client.delete('/labels/9999/', user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, label):
        response = client.delete(f'/labels/{label.id}/')
        assert response.status_code == 401
