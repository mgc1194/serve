"""
banking/handlers/accounts.py — Account handler registry.

This module defines concrete account handler implementations for each
system-supported account type and registers them in a central
ACCOUNT_HANDLERS mapping.

Handler keys are canonical, system-defined identifiers declared in
banking.constants.HandlerKeys and are seeded into the database via
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

import io
import re

import pandas as pd

from banking.constants import HandlerKeys

from .base import BaseHandler

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
            lambda row: (
                row['Transaction Amount']
                if row['Transaction Type'] == 'Credit'
                else -row['Transaction Amount']
            ),
            axis=1,
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
            lambda row: (
                row['Transaction Amount']
                if row['Transaction Type'] == 'Credit'
                else -row['Transaction Amount']
            ),
            axis=1,
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
    col_date = 'DATE'
    col_concept = 'DESCRIPTION'
    col_amount = 'AMOUNT'


class WellsFargoSavingsHandler(BaseHandler):
    account = 'WF Savings'
    date_format = '%m/%d/%Y'
    col_date = 'DATE'
    col_concept = 'DESCRIPTION'
    col_amount = 'AMOUNT'


# ── Citi ──────────────────────────────────────────────────────────────────────


class CitiCostcoHandler(BaseHandler):
    account = 'Costco Visa'
    date_format = '%m/%d/%Y'
    col_date = 'Date'
    col_concept = 'Description'
    col_amount = 'Amount'  # Derived in _apply_amount_logic
    negate_amount = True

    # Matches a dollar-formatted amount with a thousands separator, e.g.
    # "$ 4,242.86" — but not "$ 841.76", which has no comma to strip.
    _THOUSANDS_IN_DOLLAR_AMOUNT_RE = re.compile(r'\$\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?')

    def _read_and_process(self, file_path):
        # Debit/Credit aren't quoted in this export, so a thousands comma in
        # an amount (e.g. "$ 4,242.86") is otherwise indistinguishable from a
        # column delimiter to the CSV parser: it silently splits that one
        # field into two, shifting every column after it for that row. Fix
        # up the raw text before pandas ever tokenizes it into columns,
        # rather than trying to recover from already-misaligned columns.
        text = self._THOUSANDS_IN_DOLLAR_AMOUNT_RE.sub(
            lambda m: m.group(0).replace(',', ''), self._read_raw_text(file_path)
        )
        raw_df = pd.read_csv(io.StringIO(text), names=self.csv_names, header=self.csv_header)
        return self._build_clean_df(raw_df)

    @staticmethod
    def _clean_currency(value) -> float:
        """Strip '$', thousands commas, and stray whitespace (e.g. "-$ 500.00",
        "$ 291.80") down to a plain float. Citi has changed this export's
        formatting before without notice, so this tolerates either a bare
        number or a dollar-formatted one rather than assuming one or the
        other."""
        if pd.isna(value):
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        cleaned = re.sub(r'[^0-9.\-]', '', str(value))
        return float(cleaned) if cleaned else 0.0

    @staticmethod
    def _apply_amount_logic(df):
        # fillna(0) covers every column, not just Debit/Credit — _generate_dedupe_hash
        # and raw_data (base.py) hash every raw cell, so a blank Member Name or
        # Description must keep hashing as "0" (not "nan") to match dedupe_hash
        # values already stored from prior imports of the same rows.
        df = df.fillna(0)
        # Compute Amount from cleaned copies rather than overwriting Debit/Credit
        # in place — _clean_currency always returns a float, which would
        # otherwise coerce an all-integer column (e.g. 500, read as int64 when
        # the column has no blanks) to 500.0. raw_data/_generate_dedupe_hash
        # (base.py) hash Debit/Credit's original values, and raw_data is the
        # audit copy of the row (see transactions/models.py), so both must
        # keep the untouched CSV values rather than the normalized ones.
        df['Amount'] = df['Debit'].apply(CitiCostcoHandler._clean_currency) + df['Credit'].apply(
            CitiCostcoHandler._clean_currency
        )
        return df


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
    HandlerKeys.CITI_COSTCO: CitiCostcoHandler(),
}
