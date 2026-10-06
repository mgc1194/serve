"""
budgets/models.py — Category, Budget, and BudgetLine models.

Category is a household-level taxonomy, shared across every budget a
household creates (see budget roadmap doc, section 2.1). It is intentionally
NOT scoped per-budget — one set of categories serves both the existing
summary page and every future Budget/BudgetLine.

transactions.Label.category holds a nullable FK to this model (via the lazy
string reference 'budgets.Category'). A label belongs to at most one
category; categories group related labels under a shared budget area.

Budget is the household-level container a BudgetLine belongs to.
BudgetLine links a Budget to one of the household's Categories, with a
planned amount and a cached actual amount — the "actual" side of
planned-vs-actual tracking is summed from labeled transactions, but only
on an explicit refresh (api/v1/budgets.py::recompute_budget_actuals), not
computed fresh on every read.
"""

from decimal import Decimal

from django.db import models
from django.db.models import CheckConstraint, F, Q


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

    The period/type shape (a period budget has both dates in order; a
    project budget has neither) is also enforced by a database
    CheckConstraint, not just the API layer's validation — these are
    invariants reporting can rely on regardless of how a row was written
    (a bulk operation, a future update endpoint, the Django admin, ...),
    not just through this app's own POST handler.
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
        constraints = [
            # Literal 'period'/'project' rather than Type.PERIOD/Type.PROJECT:
            # a nested Meta class body can't see its enclosing class's
            # attributes while Budget is still being defined.
            CheckConstraint(
                condition=(
                    Q(
                        type='period',
                        period_start__isnull=False,
                        period_end__isnull=False,
                        period_start__lte=F('period_end'),
                    )
                    | Q(type='project', period_start__isnull=True, period_end__isnull=True)
                ),
                name='budget_period_type_matches_dates',
            ),
        ]

    def __str__(self):
        return self.name


class BudgetLine(models.Model):
    """One row inside a Budget: a category being tracked, with a planned
    amount and a cached actual amount.

    actual_amount is stored, not computed at read time — it is refreshed
    only by POST /budgets/{id}/recompute-actuals/ (api/v1/budgets.py),
    which re-sums labeled transactions for this line's category (see
    _actuals_for_categories) and persists the result along with
    actual_amount_computed_at. No other endpoint (listing, creating, or
    updating a line) touches either field — a line's actual_amount can
    only go stale or be explicitly refreshed, never silently recompute as
    a side effect of something else.

    actual_amount_computed_at is None until the first recompute. The API
    layer derives an is_stale flag for each line by comparing it against
    the latest Transaction.updated_at among that line's matching
    transactions — which, like Transaction.updated_at itself, cannot
    detect a matching transaction being deleted outright (no row is left
    to carry the signal). A line whose only matching transaction was
    deleted after the last recompute will keep reporting its old
    actual_amount as fresh until something else changes in its category.

    category is a plain CASCADE FK for now, not PROTECT — hardening that
    (so a category referenced by a historical budget line can never be
    hard-deleted) is deferred to its own later change, not bundled with
    this model's introduction, since a category referenced by a budget
    line isn't a concern until finalized-budget snapshots exist.

    Uniqueness on (budget, category): one line per category per budget —
    adjusting a target means editing the existing line, not adding a
    second, enforced by the API layer's duplicate-line rejection.

    planned_amount is a whole-dollar integer, not a Decimal — cents aren't
    meaningful for a planning target the way they are for a real
    transaction. actual_amount stays Decimal, since it's summed from real
    Transaction.amount values that do carry cents; the two are only ever
    compared, never mixed in the same arithmetic. planned_amount is
    treated throughout this API as a positive magnitude — enforced here
    with a CheckConstraint, not just the API layer's validation, for the
    same reason Budget's period/type shape is: an invariant reporting can
    rely on regardless of how a row was written.
    """

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lines')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budget_lines')
    planned_amount = models.IntegerField(default=0)
    actual_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    actual_amount_computed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'budget_lines'
        unique_together = [['budget', 'category']]
        ordering = ['category__type', 'category__name']
        constraints = [
            CheckConstraint(
                condition=Q(planned_amount__gte=0),
                name='budget_line_planned_amount_non_negative',
            ),
        ]

    def __str__(self):
        return f'{self.category.name} in {self.budget.name}'
