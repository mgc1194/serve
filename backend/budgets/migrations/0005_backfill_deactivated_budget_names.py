import re
import time
import uuid

from django.db import IntegrityError, migrations, transaction

# Mirrors Budget.name's max_length (budgets/models.py) — duplicated here
# rather than imported, since a migration's data should stay correct even
# if application code changes later.
NAME_MAX_LENGTH = 100


def backfill_deactivated_budget_names(apps, schema_editor):
    """Renames every already-deactivated budget with a disambiguating
    "(deleted #<id>)" suffix, the same as deactivate_budget now does at
    deactivation time (api/v1/budgets.py).

    Budget's (household, name) uniqueness was never conditioned on
    is_active, so a budget soft-deleted before that change shipped still
    reserves its original name forever — this backfills those rows so a
    new budget can reuse the name, without this migration itself needing
    to depend on application code that may change independently of it.
    """
    Budget = apps.get_model('budgets', 'Budget')

    for budget in Budget.objects.filter(is_active=False).iterator():
        # Already renamed by this backfill (or by deactivate_budget
        # itself, if this is somehow re-run after the fix shipped) —
        # anchored at the end so a legacy budget that legitimately
        # contains this text elsewhere in its name isn't mistaken for an
        # already-generated suffix and skipped. Matches all three
        # candidate forms (plain, timestamp-suffixed, uuid-suffixed).
        if re.search(rf' \(deleted #{budget.id}(-[0-9a-f]+)?\)$', budget.name):
            continue

        suffixes = [
            f' (deleted #{budget.id})',
            f' (deleted #{budget.id}-{int(time.time())})',
            f' (deleted #{budget.id}-{uuid.uuid4().hex[:8]})',
        ]
        original_name = budget.name
        for suffix in suffixes:
            budget.name = f'{original_name[: NAME_MAX_LENGTH - len(suffix)]}{suffix}'
            try:
                # Each attempt gets its own savepoint — a caught
                # IntegrityError otherwise poisons the whole migration's
                # transaction, blocking every later save (the next
                # candidate here, or the next budget in the loop).
                with transaction.atomic():
                    budget.save(update_fields=['name'])
                break
            except IntegrityError:
                continue
        else:
            # Every candidate collided with some other budget's literal
            # name (vanishingly unlikely) — leave this one's name as it
            # was rather than fail the whole backfill over it.
            budget.name = original_name


class Migration(migrations.Migration):
    dependencies = [
        ('budgets', '0004_budget_synced_at'),
    ]

    operations = [
        migrations.RunPython(backfill_deactivated_budget_names, migrations.RunPython.noop),
    ]
