"""
tests/users/test_models.py — Unit tests for Household and CustomUser models.
"""

import pytest
from django.contrib.auth import get_user_model

from users.models import Household

User = get_user_model()


@pytest.mark.django_db
class TestHousehold:

    @pytest.fixture
    def subject(self):
        return Household.objects.create(name='Smith Family')

    def test_household_can_be_created(self, subject):
        assert subject.pk is not None

    def test_household_string_representation(self, subject):
        assert str(subject) == 'Smith Family'

    def test_multiple_households_can_share_same_name(self):
        Household.objects.create(name='Smith Family')
        Household.objects.create(name='Smith Family')
        assert Household.objects.filter(name='Smith Family').count() == 2


@pytest.mark.django_db
class TestCustomUser:

    @pytest.fixture
    def household(self):
        return Household.objects.create(name='Smith Family')

    @pytest.fixture
    def subject(self, household):
        user = User.objects.create_user(
            username='mario',
            email='mario@example.com',
            password='testpass123',
        )
        user.households.add(household)
        return user

    def test_can_be_created(self, subject):
        assert subject.pk is not None

    def test_string_representation_with_email(self, subject):
        assert str(subject) == 'mario (mario@example.com)'

    def test_email_is_normalised_to_lowercase_on_save(self):
        user = User.objects.create_user(
            username='luigi',
            email='Luigi@Example.COM',
            password='testpass123',
        )
        assert user.email == 'luigi@example.com'

    def test_save_raises_if_email_is_missing(self):
        user = User(username='noemail')
        with pytest.raises(ValueError, match='email address is required'):
            user.save()

    def test_can_belong_to_a_household(self, subject, household):
        assert household in subject.households.all()

    def test_can_belong_to_multiple_households(self, subject):
        household2 = Household.objects.create(name='Parents Family')
        subject.households.add(household2)
        assert subject.households.count() == 2

    def test_household_has_access_to_users(self, subject, household):
        assert subject in household.users.all()
