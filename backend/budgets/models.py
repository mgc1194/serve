"""
budgets/models.py — Category and Budget models.

Category is a household-level taxonomy, shared across every budget a
household creates (see budget roadmap doc, section 2.1). It is intentionally
NOT scoped per-budget — one set of categories serves both the existing
summary page and every future Budget/BudgetLine.

transactions.Label.category holds a nullable FK to this model (via the lazy
string reference 'budgets.Category'). A label belongs to at most one
category; categories group related labels under a shared budget area.

Budget is the household-level container a BudgetLine (added in a follow-up
PR, once planned-vs-actual tracking lands) will belong to.
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


class Budget(models.Model):
    """A named container for BudgetLines (added in a follow-up PR), scoped
    either to a date range (`period`) or open-ended (`project`).

    A single budget holds both income and expense categories together — the
    split into an "Income" section and an "Expenses" section happens purely
    from each BudgetLine's category.type at display time, not from anything
    on Budget itself. `type` only distinguishes a recurring/date-bound
    budget from an open-ended one with no fixed period, e.g. a savings goal.

    Soft-delete only, same rationale as Category: `is_active` is flipped to
    False rather than the row being removed, since a deactivated budget's
    historical BudgetLines and their actuals should stay queryable.

    Uniqueness is on (household, name) — a period budget and a project
    budget don't need independent name slots the way Category's two types
    do, since a budget's type isn't part of how a household would think of
    it by name.
    """

    class Type(models.TextChoices):
        PERIOD = 'period', 'Period'
        PROJECT = 'project', 'Project'

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=Type.choices)
    period_start = models.DateField(
        null=True,
        blank=True,
        help_text='Required for period budgets; must be blank for project budgets.',
    )
    period_end = models.DateField(
        null=True,
        blank=True,
        help_text='Required for period budgets; must be blank for project budgets.',
    )
    is_active = models.BooleanField(
        default=True,
        help_text=(
            'Inactive budgets are hidden from the budgets list but preserved for '
            'historical reporting. Use instead of hard-deleting.'
        ),
    )
    household = models.ForeignKey(
        'users.Household',
        on_delete=models.CASCADE,
        related_name='budgets',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'budgets'
        unique_together = [['household', 'name']]
        ordering = ['-period_start', 'name']

    def __str__(self):
        return self.name
