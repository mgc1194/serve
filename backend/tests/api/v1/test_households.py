"""
tests/api/v1/test_households.py — Tests for household management endpoints.
"""

import pytest

from ninja.testing import TestClient

from api.v1.households import router
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
    """A household with alice as its only member."""
    h = Household.objects.create(name='Alice Household')
    h.users.add(alice)
    return h


@pytest.fixture
def shared_household(db, alice, bob):
    """A household shared by alice and bob."""
    h = Household.objects.create(name='Shared Household')
    h.users.add(alice, bob)
    return h


# ── GET /households/ ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestListHouseholds:

    def test_returns_only_users_households(self, client, alice, bob, household):
        bob_household = Household.objects.create(name="Bob's Place")
        bob_household.users.add(bob)

        response = client.get('/households/', user=alice)

        assert response.status_code == 200
        ids = [h['id'] for h in response.json()]
        assert household.id in ids
        assert bob_household.id not in ids

    def test_returns_empty_list_when_no_households(self, client, alice):
        response = client.get('/households/', user=alice)
        assert response.status_code == 200
        assert response.json() == []

    def test_unauthenticated_returns_401(self, client):
        response = client.get('/households/')
        assert response.status_code == 401

    def test_response_includes_members(self, client, alice, household):
        response = client.get('/households/', user=alice)
        assert response.status_code == 200
        members = response.json()[0]['members']
        assert any(m['email'] == alice.email for m in members)


# ── POST /households/ ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCreateHousehold:

    def test_creates_household_and_adds_creator(self, client, alice):
        response = client.post('/households/', json={'name': 'My Home'}, user=alice)

        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'My Home'
        assert any(m['email'] == alice.email for m in data['members'])

    def test_persists_to_database(self, client, alice):
        client.post('/households/', json={'name': 'My Home'}, user=alice)
        assert Household.objects.filter(name='My Home').exists()

    def test_blank_name_returns_400(self, client, alice):
        response = client.post('/households/', json={'name': '   '}, user=alice)
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()


    def test_name_is_normalized(self, client, alice):
        response = client.post('/households/', json={'name': 'smith household'}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'Smith household'

    def test_name_whitespace_is_stripped(self, client, alice):
        response = client.post('/households/', json={'name': '  My Home  '}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'My Home'

    def test_duplicate_name_for_same_user_returns_400(self, client, alice):
        client.post('/households/', json={'name': 'My Home'}, user=alice)
        response = client.post('/households/', json={'name': 'My Home'}, user=alice)
        assert response.status_code == 400
        assert 'already have a household named' in response.json()['detail']

    def test_duplicate_name_for_different_user_is_allowed(self, client, alice, bob):
        client.post('/households/', json={'name': 'My Home'}, user=alice)
        response = client.post('/households/', json={'name': 'My Home'}, user=bob)
        assert response.status_code == 200
    def test_unauthenticated_returns_401(self, client):
        response = client.post('/households/', json={'name': 'My Home'})
        assert response.status_code == 401


# ── GET /households/{id}/ ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestGetHousehold:

    def test_returns_household(self, client, alice, household):
        response = client.get(f'/households/{household.id}/', user=alice)
        assert response.status_code == 200
        assert response.json()['id'] == household.id
        assert response.json()['name'] == household.name

    def test_includes_members(self, client, alice, household):
        response = client.get(f'/households/{household.id}/', user=alice)
        members = response.json()['members']
        assert any(m['email'] == alice.email for m in members)

    def test_non_member_returns_403(self, client, bob, household):
        response = client.get(f'/households/{household.id}/', user=bob)
        assert response.status_code == 403

    def test_nonexistent_returns_404(self, client, alice):
        response = client.get('/households/99999/', user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.get(f'/households/{household.id}/')
        assert response.status_code == 401


# ── PATCH /households/{id}/ ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestRenameHousehold:

    def test_renames_household(self, client, alice, household):
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': 'New Name'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'New Name'

    def test_persists_new_name(self, client, alice, household):
        client.patch(f'/households/{household.id}/', json={'name': 'New Name'}, user=alice)
        household.refresh_from_db()
        assert household.name == 'New Name'

    def test_blank_name_returns_400(self, client, alice, household):
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': '   '},
            user=alice,
        )
        assert response.status_code == 400


    def test_name_is_normalized_on_rename(self, client, alice, household):
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': 'new name'},
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'New name'

    def test_duplicate_name_for_same_user_returns_400(self, client, alice, household):
        other = Household.objects.create(name='Other Home')
        other.users.add(alice)
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': 'Other Home'},
            user=alice,
        )
        assert response.status_code == 400
        assert 'already have a household named' in response.json()['detail']

    def test_rename_to_same_name_is_allowed(self, client, alice, household):
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': household.name},
            user=alice,
        )
        assert response.status_code == 200
    def test_non_member_returns_403(self, client, bob, household):
        response = client.patch(
            f'/households/{household.id}/',
            json={'name': 'Hacked'},
            user=bob,
        )
        assert response.status_code == 403

    def test_nonexistent_returns_404(self, client, alice):
        response = client.patch('/households/99999/', json={'name': 'X'}, user=alice)
        assert response.status_code == 404


# ── DELETE /households/{id}/ ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeleteHousehold:

    def test_deletes_household(self, client, alice, household):
        response = client.delete(f'/households/{household.id}/', user=alice)
        assert response.status_code == 200
        assert not Household.objects.filter(pk=household.id).exists()

    def test_non_member_returns_403(self, client, bob, household):
        response = client.delete(f'/households/{household.id}/', user=bob)
        assert response.status_code == 403
        assert Household.objects.filter(pk=household.id).exists()

    def test_nonexistent_returns_404(self, client, alice):
        response = client.delete('/households/99999/', user=alice)
        assert response.status_code == 404

    def test_unauthenticated_returns_401(self, client, household):
        response = client.delete(f'/households/{household.id}/')
        assert response.status_code == 401


# ── POST /households/{id}/members/ ────────────────────────────────────────────

@pytest.mark.django_db
class TestAddMember:

    def test_adds_member_by_email(self, client, alice, bob, household):
        response = client.post(
            f'/households/{household.id}/members/',
            json={'email': bob.email},
            user=alice,
        )
        assert response.status_code == 200
        members = response.json()['members']
        assert any(m['email'] == bob.email for m in members)

    def test_member_persisted_in_database(self, client, alice, bob, household):
        client.post(
            f'/households/{household.id}/members/',
            json={'email': bob.email},
            user=alice,
        )
        assert household.users.filter(pk=bob.pk).exists()

    def test_unknown_email_returns_400(self, client, alice, household):
        response = client.post(
            f'/households/{household.id}/members/',
            json={'email': 'nobody@example.com'},
            user=alice,
        )
        assert response.status_code == 400
        assert 'no account' in response.json()['detail'].lower()

    def test_already_member_returns_400(self, client, alice, household):
        response = client.post(
            f'/households/{household.id}/members/',
            json={'email': alice.email},
            user=alice,
        )
        assert response.status_code == 400
        assert 'already a member' in response.json()['detail'].lower()

    def test_non_member_cannot_add(self, client, bob, household):
        response = client.post(
            f'/households/{household.id}/members/',
            json={'email': bob.email},
            user=bob,
        )
        assert response.status_code == 403

    def test_email_lookup_is_case_insensitive(self, client, alice, bob, household):
        response = client.post(
            f'/households/{household.id}/members/',
            json={'email': bob.email.upper()},
            user=alice,
        )
        assert response.status_code == 200


# ── DELETE /households/{id}/members/{user_id}/ ────────────────────────────────

@pytest.mark.django_db
class TestRemoveMember:

    def test_removes_member(self, client, alice, bob, shared_household):
        response = client.delete(
            f'/households/{shared_household.id}/members/{bob.id}/',
            user=alice,
        )
        assert response.status_code == 200
        assert not any(m['email'] == bob.email for m in response.json()['members'])

    def test_member_removed_from_database(self, client, alice, bob, shared_household):
        client.delete(
            f'/households/{shared_household.id}/members/{bob.id}/',
            user=alice,
        )
        assert not shared_household.users.filter(pk=bob.pk).exists()

    def test_user_can_remove_themselves(self, client, alice, bob, shared_household):
        response = client.delete(
            f'/households/{shared_household.id}/members/{bob.id}/',
            user=bob,
        )
        assert response.status_code == 200

    def test_last_member_cannot_be_removed(self, client, alice, household):
        response = client.delete(
            f'/households/{household.id}/members/{alice.id}/',
            user=alice,
        )
        assert response.status_code == 400
        assert 'last member' in response.json()['detail'].lower()

    def test_non_member_returns_403(self, client, alice, bob, household):
        response = client.delete(
            f'/households/{household.id}/members/{alice.id}/',
            user=bob,
        )
        assert response.status_code == 403

    def test_target_not_in_household_returns_400(self, client, alice, bob, household):
        response = client.delete(
            f'/households/{household.id}/members/{bob.id}/',
            user=alice,
        )
        assert response.status_code == 400
        assert 'not a member' in response.json()['detail'].lower()

    def test_nonexistent_household_returns_404(self, client, alice):
        response = client.delete(f'/households/99999/members/{alice.id}/', user=alice)
        assert response.status_code == 404
