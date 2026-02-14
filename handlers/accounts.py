from handlers.base import BaseHandler


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
    'SoFi Savings': SoFiSavingsHandler(),
    'SoFi Checking': SoFiCheckingHandler(),
    'CO Checking': CapitalOneCheckingHandler(),
    'CO Savings': CapitalOneSavingsHandler(),
    'Quicksilver': CapitalOneQuicksilverHandler(),
    'Delta': AmexHandler(),
    'Chase': ChaseHandler(),
    'Discover': DiscoverHandler(),
    'WF Checking': WellsFargoCheckingHandler(),
    'WF Savings': WellsFargoSavingsHandler(),
}
