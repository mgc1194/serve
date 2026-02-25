from django.db import migrations
from django.utils import timezone


def seed_account_types(apps, schema_editor):
    Bank = apps.get_model("transactions", "Bank")
    AccountType = apps.get_model("transactions", "AccountType")

    now = timezone.now()

    data = [
        ("SoFi", "SoFi Savings", "sofi-savings"),
        ("SoFi", "SoFi Checking", "sofi-checking"),

        ("Capital One", "360 Checking", "co-checking"),
        ("Capital One", "360 Performance Savings", "co-savings"),
        ("Capital One", "Quicksilver Credit Card", "co-quicksilver"),

        ("Wells Fargo", "Checking", "wf-checking"),
        ("Wells Fargo", "Savings", "wf-savings"),

        ("Chase", "Chase Card", "chase"),
        ("Discover", "Discover Card", "discover"),
        ("American Express", "Delta SkyMiles Card", "amex-delta"),
    ]

    for bank_name, name, handler_key in data:
        bank = Bank.objects.get(name=bank_name)

        AccountType.objects.update_or_create(
            handler_key=handler_key,
            defaults={
                "name": name,
                "bank": bank,
                "updated_at": now,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0002_seed_banks"),
    ]

    operations = [
        migrations.RunPython(seed_account_types, migrations.RunPython.noop),
    ]