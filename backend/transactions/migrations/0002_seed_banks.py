from django.db import migrations
from django.utils import timezone


def seed_banks(apps, schema_editor):
    Bank = apps.get_model("transactions", "Bank")

    banks = [
        ("SoFi", "banks/sofi.png"),
        ("Capital One", "banks/capital_one.png"),
        ("Wells Fargo", "banks/wells_fargo.png"),
        ("Chase", "banks/chase.png"),
        ("Discover", "banks/discover.png"),
        ("American Express", "banks/amex.png"),
    ]

    now = timezone.now()

    for name, logo in banks:
        Bank.objects.update_or_create(
            name=name,
            defaults={
                "logo": logo,
                "updated_at": now,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_banks, migrations.RunPython.noop),
    ]