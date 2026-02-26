import pytest
from django.contrib.auth import get_user_model
from users.models import Household

User = get_user_model()


@pytest.mark.django_db
class TestHousehold:

    @pytest.fixture
    def subject(selfself):
        return Household.objects.create(name='Smith Family')

    def test_household_can_be_created(selfself, subject):
        assert subject.pk is not None

    def test_household_string_representation(selfself, subject):
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

    def test_string_representation_without_email(self):
        user = User.objects.create_user(username='noemail', password='testpass123')
        assert str(user) == 'noemail'

    def test_can_belong_to_a_household(self, subject, household):
        assert household in subject.households.all()

    def test_can_belong_to_multiple_households(self, subject):
        household2 = Household.objects.create(name='Parents Family')
        subject.households.add(household2)
        assert subject.households.count() == 2

    def test_household_has_access_to_users(self, subject, household):
        assert subject in household.users.all()
