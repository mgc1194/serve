"""
transactions/handlers/accounts.py —Account handler registry.

This module defines concrete account handler implementations for each
system-supported account type and registers them in a central
ACCOUNT_HANDLERS mapping.

Handler keys are canonical, system-defined identifiers declared in
transactions.constants.HandlerKeys and are seeded into the database via
data migrations. Each AccountType record references one of these keys,
which is then resolved at runtime to a concrete handler instance through
this registry.

This design intentionally centralizes the mapping between persisted
AccountType records and their corresponding parsing/normalization logic,
ensuring:
- handler keys are stable and explicit
- handlers are singletons (one instance per account type)
- system-defined account types remain consistent across migrations, tests,
  and runtime behavior

User-defined account types are not supported; adding a new account type
requires both a new handler implementation and a corresponding data
migration.
"""


from .base import BaseHandler
from transactions.constants import HandlerKeys


# ── SoFi ──────────────────────────────────────────────────────────────────────

class SoFiSavingsHandler(BaseHandler):
    account = 'SoFi Savings'
    date_format = '%Y-%m-%d'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'


class SoFiCheckingHandler(BaseHandler):
    account = 'SoFi Checking'
    date_format = '%Y-%m-%d'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'


# ── Capital One ───────────────────────────────────────────────────────────────

class CapitalOneCheckingHandler(BaseHandler):
    account = 'CO Checking'
    date_format = '%m/%d/%y'
    col_date = 'Transaction Date'
    col_concept = 'Transaction Description'
    col_amount = 'Amount'  # Derived in _apply_amount_logic

    @staticmethod
    def _apply_amount_logic(df):
        df['Amount'] = df.apply(
            lambda row: row['Transaction Amount']
            if row['Transaction Type'] == 'Credit'
            else -row['Transaction Amount'],
            axis=1
        )
        return df


class CapitalOneSavingsHandler(BaseHandler):
    account = 'CO Savings'
    date_format = '%m/%d/%y'
    col_date = 'Transaction Date'
    col_concept = 'Transaction Description'
    col_amount = 'Amount'  # Derived in _apply_amount_logic

    @staticmethod
    def _apply_amount_logic(df):
        df['Amount'] = df.apply(
            lambda row: row['Transaction Amount']
            if row['Transaction Type'] == 'Credit'
            else -row['Transaction Amount'],
            axis=1
        )
        return df


class CapitalOneQuicksilverHandler(BaseHandler):
    account = 'Quicksilver'
    date_format = '%Y-%m-%d'
    col_date = 'Transaction Date'
    col_concept = 'Description'
    col_amount = 'Amount'  # Derived in _apply_amount_logic

    @staticmethod
    def _apply_amount_logic(df):
        df = df.fillna(0)
        df['Amount'] = df['Credit'] - df['Debit']
        return df


# ── Amex ──────────────────────────────────────────────────────────────────────

class AmexHandler(BaseHandler):
    account = 'Delta'
    date_format = '%m/%d/%Y'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'
    negate_amount = True


# ── Chase ─────────────────────────────────────────────────────────────────────

class ChaseHandler(BaseHandler):
    account = 'Chase'
    date_format = '%m/%d/%Y'
    col_date = 'Transaction Date'
    col_concept = 'Description'
    col_amount = 'Amount'


# ── Discover ──────────────────────────────────────────────────────────────────

class DiscoverHandler(BaseHandler):
    account = 'Discover'
    date_format = '%m/%d/%Y'
    col_date = 'Trans. Date'
    col_concept = 'Description'
    col_amount = 'Amount'
    negate_amount = True


# ── Wells Fargo ───────────────────────────────────────────────────────────────

class WellsFargoCheckingHandler(BaseHandler):
    account = 'WF Checking'
    date_format = '%m/%d/%Y'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'
    csv_names = ['Date', 'Amount', '*', '_', 'Description']
    csv_header = None


class WellsFargoSavingsHandler(BaseHandler):
    account = 'WF Savings'
    date_format = '%m/%d/%Y'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'
    csv_names = ['Date', 'Amount', '*', '_', 'Description']
    csv_header = None


# ── Registry ──────────────────────────────────────────────────────────────────
# Keys are the display names shown in the UI / used in the CLI.
# Values are handler instances — one per supported account type.

ACCOUNT_HANDLERS = {
    HandlerKeys.SOFI_SAVINGS: SoFiSavingsHandler(),
    HandlerKeys.SOFI_CHECKING: SoFiCheckingHandler(),
    HandlerKeys.CO_CHECKING: CapitalOneCheckingHandler(),
    HandlerKeys.CO_SAVINGS: CapitalOneSavingsHandler(),
    HandlerKeys.CO_QUICKSILVER: CapitalOneQuicksilverHandler(),
    HandlerKeys.AMEX_DELTA: AmexHandler(),
    HandlerKeys.CHASE: ChaseHandler(),
    HandlerKeys.DISCOVER: DiscoverHandler(),
    HandlerKeys.WF_CHECKING: WellsFargoCheckingHandler(),
    HandlerKeys.WF_SAVINGS: WellsFargoSavingsHandler(),
}
