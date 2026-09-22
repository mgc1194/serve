"""
budgets/models.py — Category, Budget, and BudgetLine models.

Category is a household-level taxonomy, shared across every budget a
household creates (see budget roadmap doc, section 2.1). It is intentionally
NOT scoped per-budget — one set of categories serves both the existing
summary page and every future Budget/BudgetLine.

transactions.Label.category holds a nullable FK to this model (via the lazy
string reference 'budgets.Category'). A label belongs to at most one
category; categories group related labels under a shared budget area.

Budget is a named planning container (a month, a trip). BudgetLine links a
Budget to one of the household's Categories, optionally with a planned
amount — that amount isn't editable anywhere yet (a later PR), so it
defaults to zero for now.
"""

from decimal import Decimal

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
    """A named planning container for a period ("September 2026") or an
    open-ended goal ("Iceland Trip").

    Soft-delete only, mirroring Category — see that model's docstring for
    why. Uniqueness on (household, name, type) for the same reason: the API
    layer reactivates a soft-deleted row instead of erroring on a
    "duplicate" create.

    period_start/period_end are required together for spending/earning
    budgets (a fixed period to track) and must both be null for project
    budgets (an open-ended goal with no period to close out). That
    type-dependent shape is validated in the API layer, not here — same
    division of responsibility as Category's (household, name, type)
    reactivation logic.
    """

    class Type(models.TextChoices):
        SPENDING = 'spending', 'Spending'
        EARNING = 'earning', 'Earning'
        PROJECT = 'project', 'Project'

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=Type.choices)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive budgets are hidden from pickers. Use instead of hard-deleting.',
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
        unique_together = [['household', 'name', 'type']]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'


class BudgetLine(models.Model):
    """One row inside a Budget: a category being tracked, with a planned
    amount (not yet editable anywhere — see module docstring).

    category is a plain CASCADE FK for now, not PROTECT — the spec
    sequences that hardening as its own later PR, not bundled with this
    model's introduction, since a category referenced by a historical
    budget line isn't a concern until finalized-budget snapshots exist.

    Uniqueness on (budget, category): one line per category per budget:
    adjusting a target means editing the existing line, not adding a
    second — enforced by the API layer's duplicate-line rejection.
    """

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lines')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budget_lines')
    planned_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'budget_lines'
        unique_together = [['budget', 'category']]
        ordering = ['category__type', 'category__name']

    def __str__(self):
        return f'{self.category.name} in {self.budget.name}'
