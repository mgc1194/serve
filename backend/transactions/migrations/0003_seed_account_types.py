from django.db import migrations
from django.utils import timezone
from transactions.constants import HandlerKeys


def seed_account_types(apps, schema_editor):
    Bank = apps.get_model("transactions", "Bank")
    AccountType = apps.get_model("transactions", "AccountType")

    now = timezone.now()

    data = [
        ("SoFi", "SoFi Savings", HandlerKeys.SOFI_SAVINGS),
        ("SoFi", "SoFi Checking", HandlerKeys.SOFI_CHECKING),
        ("Capital One", "360 Checking", HandlerKeys.CO_CHECKING),
        ("Capital One", "360 Performance Savings", HandlerKeys.CO_SAVINGS),
        ("Capital One", "Quicksilver Credit Card", HandlerKeys.CO_QUICKSILVER),
        ("Wells Fargo", "Checking", HandlerKeys.WF_CHECKING),
        ("Wells Fargo", "Savings", HandlerKeys.WF_SAVINGS),
        ("Chase", "Chase Card", HandlerKeys.CHASE),
        ("Discover", "Discover Card", HandlerKeys.DISCOVER),
        ("American Express", "Delta SkyMiles Card", HandlerKeys.AMEX_DELTA),
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
