"""
tests/api/v1/test_accounts.py — Tests for account management endpoints.
"""

import pytest
from ninja.testing import TestClient

from api.v1.accounts import router
from transactions.models import Account, AccountType, Transaction
from users.models import CustomUser, Household


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
def other_household(db, bob):
    """A household that alice does not belong to."""
    h = Household.objects.create(name='Bob Household')
    h.users.add(bob)
    return h


@pytest.fixture
def account_type(db):
    return AccountType.objects.get(handler_key='sofi-savings')


@pytest.fixture
def account(db, account_type, household):
    return Account.objects.create(
        name='My Savings',
        account_type=account_type,
        household=household,
    )


@pytest.mark.django_db
class TestListAccounts:
    @pytest.fixture
    def second_household(self, db, alice):
        """A second household also belonging to alice."""
        h = Household.objects.create(name='Alice Second Home')
        h.users.add(alice)
        return h

    @pytest.fixture
    def co_account(self, db, second_household):
        at = AccountType.objects.get(handler_key='co-savings')
        return Account.objects.create(
            name='CO Savings', account_type=at, household=second_household
        )

    def test_returns_all_accounts_across_user_households(self, client, alice, account, co_account):
        response = client.get('/accounts/', user=alice)
        assert response.status_code == 200
        ids = {a['id'] for a in response.json()}
        assert account.id in ids
        assert co_account.id in ids

    def test_does_not_return_accounts_from_other_users_households(
        self, client, alice, bob, other_household, account_type
    ):
        Account.objects.create(
            name='Bob Only', account_type=account_type, household=other_household
        )
        response = client.get('/accounts/', user=alice)
        names = {a['name'] for a in response.json()}
        assert 'Bob Only' not in names

    def test_filters_by_household_id(self, client, alice, account, co_account, household):
        response = client.get(f'/accounts/?household_id={household.id}', user=alice)
        assert response.status_code == 200
        ids = {a['id'] for a in response.json()}
        assert account.id in ids
        assert co_account.id not in ids

    def test_filters_by_bank_id(self, client, alice, account, co_account):
        sofi_bank_id = account.account_type.bank.id
        response = client.get(f'/accounts/?bank_id={sofi_bank_id}', user=alice)
        assert response.status_code == 200
        bank_names = {a['bank_name'] for a in response.json()}
        assert bank_names == {'SoFi'}
        assert co_account.id not in {a['id'] for a in response.json()}

    def test_filters_by_household_and_bank_combined(
        self, client, alice, account, co_account, household
    ):
        sofi_bank_id = account.account_type.bank.id
        response = client.get(
            f'/accounts/?household_id={household.id}&bank_id={sofi_bank_id}', user=alice
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['id'] == account.id

    def test_sorts_by_bank_by_default(self, client, alice, account, co_account):
        response = client.get('/accounts/', user=alice)
        bank_names = [a['bank_name'] for a in response.json()]
        assert bank_names == sorted(bank_names)

    def test_sorts_by_name(self, client, alice, household, account_type):
        Account.objects.create(name='Aardvark', account_type=account_type, household=household)
        Account.objects.create(name='Zebra', account_type=account_type, household=household)
        response = client.get('/accounts/?sort=name', user=alice)
        names = [a['name'] for a in response.json()]
        assert names == sorted(names)

    def test_sorts_by_household(self, client, alice, account, co_account):
        response = client.get('/accounts/?sort=household', user=alice)
        household_names = [a['household_name'] for a in response.json()]
        assert household_names == sorted(household_names)

    def test_sorts_by_created_at_descending(self, client, alice, account, co_account):
        response = client.get('/accounts/?sort=created_at', user=alice)
        data = response.json()
        dates = [a['created_at'] for a in data]
        assert dates == sorted(dates, reverse=True)

    def test_returns_403_if_household_belongs_to_other_user(self, client, alice, other_household):
        response = client.get(f'/accounts/?household_id={other_household.id}', user=alice)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice):
        response = client.get('/accounts/?household_id=9999', user=alice)
        assert response.status_code == 404

    def test_returns_empty_list_when_no_accounts(self, client, alice):
        response = client.get('/accounts/', user=alice)
        assert response.status_code == 200
        assert response.json() == []

    def test_response_shape(self, client, alice, account):
        response = client.get('/accounts/', user=alice)
        item = response.json()[0]
        assert set(item.keys()) == {
            'id',
            'name',
            'handler_key',
            'account_type_id',
            'account_type',
            'bank_id',
            'bank_name',
            'household_id',
            'household_name',
            'created_at',
            'updated_at',
        }


@pytest.mark.django_db
class TestCreateAccount:
    def test_creates_account_successfully(self, client, alice, household, account_type):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': 'My 360 Savings',
            },
            user=alice,
        )
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'My 360 Savings'
        assert data['bank_name'] == 'SoFi'
        assert data['account_type'] == 'SoFi Savings'
        assert data['handler_key'] == 'sofi-savings'
        assert 'id' in data
        assert 'created_at' in data
        assert 'updated_at' in data

    def test_account_is_persisted(self, client, alice, household, account_type):
        client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': 'Persisted Account',
            },
            user=alice,
        )
        assert Account.objects.filter(name='Persisted Account', household=household).exists()

    def test_trims_whitespace_from_name(self, client, alice, household, account_type):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': '  Trimmed Name  ',
            },
            user=alice,
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Trimmed Name'

    def test_returns_400_for_blank_name(self, client, alice, household, account_type):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': '   ',
            },
            user=alice,
        )
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_returns_400_for_duplicate_name_in_household(
        self, client, alice, household, account_type, account
    ):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': 'My Savings',  # matches account fixture
            },
            user=alice,
        )
        assert response.status_code == 400
        assert 'already exists' in response.json()['detail'].lower()

    def test_allows_same_name_in_different_households(
        self, client, alice, bob, household, other_household, account_type
    ):
        # Create account with same name in other_household
        Account.objects.create(
            name='Shared Name',
            account_type=account_type,
            household=other_household,
        )
        other_household.users.add(alice)

        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': 'Shared Name',
            },
            user=alice,
        )
        assert response.status_code == 200

    def test_returns_403_if_not_a_member(self, client, bob, household, account_type):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': account_type.id,
                'name': 'Bob Sneaking In',
            },
            user=bob,
        )
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_household(self, client, alice, account_type):
        response = client.post(
            '/accounts/',
            json={
                'household_id': 9999,
                'account_type_id': account_type.id,
                'name': 'Ghost Account',
            },
            user=alice,
        )
        assert response.status_code == 404

    def test_returns_404_for_nonexistent_account_type(self, client, alice, household):
        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': 9999,
                'name': 'Unknown Type Account',
            },
            user=alice,
        )
        assert response.status_code == 404

    def test_different_account_types_same_name_not_allowed(self, client, alice, household):
        at_checking = AccountType.objects.get(handler_key='sofi-checking')
        at_savings = AccountType.objects.get(handler_key='sofi-savings')

        Account.objects.create(name='My Account', account_type=at_checking, household=household)

        response = client.post(
            '/accounts/',
            json={
                'household_id': household.id,
                'account_type_id': at_savings.id,
                'name': 'My Account',
            },
            user=alice,
        )
        # unique_together is on (household, name) — same name is NOT allowed
        assert response.status_code == 400


@pytest.mark.django_db
class TestRenameAccount:
    def test_renames_account_successfully(self, client, alice, account):
        response = client.patch(f'/accounts/{account.id}/', json={'name': 'New Name'}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == 'New Name'

    def test_rename_is_persisted(self, client, alice, account):
        client.patch(f'/accounts/{account.id}/', json={'name': 'Persisted Rename'}, user=alice)
        account.refresh_from_db()
        assert account.name == 'Persisted Rename'

    def test_trims_whitespace_from_name(self, client, alice, account):
        response = client.patch(
            f'/accounts/{account.id}/', json={'name': '  Trimmed  '}, user=alice
        )
        assert response.status_code == 200
        assert response.json()['name'] == 'Trimmed'

    def test_returns_full_account_detail(self, client, alice, account):
        response = client.patch(f'/accounts/{account.id}/', json={'name': 'Renamed'}, user=alice)
        data = response.json()
        assert set(data.keys()) == {
            'id',
            'name',
            'handler_key',
            'account_type_id',
            'account_type',
            'bank_id',
            'bank_name',
            'household_id',
            'household_name',
            'created_at',
            'updated_at',
        }

    def test_returns_400_for_blank_name(self, client, alice, account):
        response = client.patch(f'/accounts/{account.id}/', json={'name': '   '}, user=alice)
        assert response.status_code == 400
        assert 'blank' in response.json()['detail'].lower()

    def test_returns_400_for_duplicate_name_in_household(
        self, client, alice, household, account, account_type
    ):
        Account.objects.create(name='Other Account', account_type=account_type, household=household)
        response = client.patch(
            f'/accounts/{account.id}/', json={'name': 'Other Account'}, user=alice
        )
        assert response.status_code == 400
        assert 'already exists' in response.json()['detail'].lower()

    def test_renaming_to_same_name_is_a_no_op(self, client, alice, account):
        response = client.patch(f'/accounts/{account.id}/', json={'name': account.name}, user=alice)
        assert response.status_code == 200
        assert response.json()['name'] == account.name

    def test_returns_403_if_not_a_member(self, client, bob, account):
        response = client.patch(f'/accounts/{account.id}/', json={'name': 'Hacked'}, user=bob)
        assert response.status_code == 403

    def test_returns_404_for_nonexistent_account(self, client, alice):
        response = client.patch('/accounts/9999/', json={'name': 'Does Not Exist'}, user=alice)
        assert response.status_code == 404


@pytest.mark.django_db
class TestDeleteAccount:
    def test_deletes_account_successfully(self, client, alice, account):
        response = client.delete(f'/accounts/{account.id}/', user=alice)
        assert response.status_code == 204
        assert not Account.objects.filter(pk=account.id).exists()

    def test_returns_404_for_nonexistent_account(self, client, alice):
        response = client.delete('/accounts/9999/', user=alice)
        assert response.status_code == 404

    def test_returns_403_if_not_a_member(self, client, bob, account):
        response = client.delete(f'/accounts/{account.id}/', user=bob)
        assert response.status_code == 403
        assert Account.objects.filter(pk=account.id).exists()

    def test_returns_409_if_account_has_transactions(self, client, alice, account):
        Transaction.objects.create(
            dedupe_hash='a' * 64,
            raw_data={'Date': '2026-01-15', 'Description': 'TRANSACTION', 'Amount': '-45.50'},
            date='2026-01-15',
            concept='TRADER JOES',
            amount=-45.50,
            account=account,
        )
        response = client.delete(f'/accounts/{account.id}/', user=alice)
        assert response.status_code == 409
        assert 'transactions' in response.json()['detail'].lower()
        assert Account.objects.filter(pk=account.id).exists()
