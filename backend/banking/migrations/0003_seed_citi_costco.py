from django.db import migrations
from django.utils import timezone


def seed_citi_costco(apps, schema_editor):
    Bank = apps.get_model('banking', 'Bank')
    AccountType = apps.get_model('banking', 'AccountType')

    now = timezone.now()

    bank, _ = Bank.objects.update_or_create(
        name='Citi',
        defaults={
            'logo': 'banks/citi.png',
            'updated_at': now,
        },
    )

    AccountType.objects.update_or_create(
        handler_key='citi-costco',
        defaults={
            'name': 'Costco Anywhere Visa Card',
            'bank': bank,
            'updated_at': now,
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ('banking', '0002_add_citi_costco_handler'),
        # banking/0001_initial is a state-only migration (SeparateDatabaseAndState
        # with no database_operations) that claims the banks/account_types tables
        # without depending on the migration that actually creates them. This is
        # the first real DB-touching migration in the banking app's chain, so it
        # must depend on transactions/0001_initial directly to guarantee the
        # tables exist first — mirrors the cross-app dependency already used in
        # transactions/migrations/0008_account_fk_to_banking.py.
        ('transactions', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_citi_costco, migrations.RunPython.noop),
    ]
