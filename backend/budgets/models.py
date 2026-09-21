"""
budgets/models.py — Category model.

Category is a household-level taxonomy, shared across every budget a
household creates (see budget roadmap doc, section 2.1). It is intentionally
NOT scoped per-budget — one set of categories serves both the existing
summary page and every future Budget/BudgetLine.

transactions.Label.category holds a nullable FK to this model (via the lazy
string reference 'budgets.Category'). A label belongs to at most one
category; categories group related labels under a shared budget area.
"""

from django.db import models


class Category(models.Model):
    """A household-level spending or earning category.

    Soft-delete only: `is_active` is flipped to False rather than the row
    being removed. This matters once BudgetLine.category exists as a
    PROTECT FK (PR 4) — a category referenced by any historical budget line
    can never be hard-deleted, so soft-delete is the only way for a
    household to retire a category they no longer want to see in pickers.

    Uniqueness is on (household, name, type), not just (household, name) —
    a household can have both an "Other" earning category and an "Other"
    spending category; these are independent rows, not duplicates. `type`
    is part of a category's identity.

    Because soft-delete never frees up the (household, name, type) tuple,
    the API layer (not this model) is responsible for reactivating a
    soft-deleted row instead of inserting a new one when a household
    "recreates" a category with the same (name, type).
    """

    class Type(models.TextChoices):
        EARNING = 'earning', 'Earning'
        SPENDING = 'spending', 'Spending'

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=Type.choices)
    is_active = models.BooleanField(
        default=True,
        help_text=(
            'Inactive categories are hidden from pickers but preserved for '
            'historical budget lines. Use instead of hard-deleting.'
        ),
    )
    household = models.ForeignKey(
        'users.Household',
        on_delete=models.CASCADE,
        related_name='categories',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        unique_together = [['household', 'name', 'type']]
        ordering = ['type', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'
