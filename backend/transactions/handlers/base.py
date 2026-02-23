"""
transactions/handlers/base.py — Base class for all account transaction handlers.

To add a new account handler, subclass BaseHandler and declare the
class-level attributes. Override `_apply_amount_logic` only if the
account needs custom amount calculation before the DataFrame is built
(e.g. Capital One's Credit/Debit column logic).

Example — minimal subclass:

    from transactions.handlers.base import BaseHandler

    class SoFiSavingsHandler(BaseHandler):
        account     = 'SoFi Savings'
        date_format = '%Y-%m-%d'
        col_date    = 'Date'
        col_concept = 'Description'
        col_amount  = 'Amount'


Example — subclass with amount negation (e.g. Amex, Discover):

    class AmexHandler(BaseHandler):
        account     = 'Delta'
        date_format = '%m/%d/%Y'
        col_date    = 'Date'
        col_concept = 'Description'
        col_amount  = 'Amount'
        negate_amount = True


Example — subclass with custom amount logic (e.g. Capital One):

    class CapitalOneCheckingHandler(BaseHandler):
        account     = 'CO Checking'
        date_format = '%m/%d/%y'
        col_date    = 'Transaction Date'
        col_concept = 'Transaction Description'
        col_amount  = 'Amount'  # Populated by _apply_amount_logic

        @staticmethod
        def _apply_amount_logic(df):
            df['Amount'] = df.apply(
                lambda row: row['Transaction Amount']
                if row['Transaction Type'] == 'Credit'
                else -row['Transaction Amount'],
                axis=1
            )
            return df


Example — subclass with no headers (e.g. Wells Fargo):

    class WellsFargoCheckingHandler(BaseHandler):
        account     = 'WF Checking'
        date_format = '%m/%d/%Y'
        col_date    = 'Date'
        col_concept = 'Description'
        col_amount  = 'Amount'
        csv_names   = ['Date', 'Amount', '*', '_', 'Description']
        csv_header  = None
"""

from __future__ import annotations

import hashlib
import io
import logging
import pandas as pd
from typing import Optional

logger = logging.getLogger(__name__)


class BaseHandler:
    # ── Required — must be set by every subclass ───────────────────────────
    account: str = None  # Account name written to the 'Account' column
    date_format: str = None  # strptime format string for the date column
    col_date: str = None  # Source CSV column name for the date
    col_concept: str = None  # Source CSV column name for the description
    col_amount: str = None  # Source CSV column name for the amount

    # ── Optional overrides ─────────────────────────────────────────────────
    encoding: str = 'latin1'  # CSV file encoding
    negate_amount: bool = False  # Set True if the bank inverts sign (e.g. Amex, Discover)
    csv_names: list = None  # Column names to assign (for headerless CSVs e.g. Wells Fargo)
    csv_header: Optional[int] = 0  # Row number of header; None for headerless CSVs

    # ── Public entry point ─────────────────────────────────────────────────

    def process(self, file_path: str | io.BytesIO) -> Optional[pd.DataFrame]:
        """
        Parse, clean, and return a normalized DataFrame for this account.
        Returns None and logs the error if anything goes wrong.
        """
        try:
            logger.info(f'Processing: {file_path}')
            df = self._read_and_process(file_path)
            logger.info(f'Successfully processed: {file_path}')
            return df
        except FileNotFoundError:
            logger.error(f'File not found: {file_path}')
        except pd.errors.EmptyDataError:
            logger.error(f'No data in file: {file_path}')
        except pd.errors.ParserError as e:
            logger.error(f'Parsing error in {file_path}: {e}')
        except Exception as e:
            logger.error(f'Unexpected error processing {file_path}: {e}')
        return None

    # ── Internal ───────────────────────────────────────────────────────────

    def _read_and_process(self, file_path: str) -> pd.DataFrame:
        raw_df = pd.read_csv(
            file_path,
            encoding=self.encoding,
            names=self.csv_names,
            header=self.csv_header,
        )

        # Hook for subclasses that need custom amount derivation
        raw_df = self._apply_amount_logic(raw_df)

        amount = -raw_df[self.col_amount] if self.negate_amount else raw_df[self.col_amount]

        clean_df = pd.DataFrame({
            'ID': raw_df.apply(self._generate_id, axis=1),
            'Date': pd.to_datetime(raw_df[self.col_date], format=self.date_format),
            'Concept': raw_df[self.col_concept],
            'Account': self.account,
            'Amount': amount,
            'Label': None,
            'Category': None,
            'Additional Labels': None,
        })

        return clean_df

    @staticmethod
    def _apply_amount_logic(df: pd.DataFrame) -> pd.DataFrame:
        """
        Override in subclasses that derive the amount column from multiple
        source columns before the clean DataFrame is built.
        The default implementation is a no-op.
        """
        return df

    @staticmethod
    def _generate_id(row: pd.Series) -> str:
        """MD5 hash of all raw CSV columns — intentionally uses raw data
        so that fields like 'current balance' or 'transaction id' disambiguate otherwise
        identical rows (e.g. two transactions with the same date and amount)."""
        unique_string = '_'.join(row.astype(str))
        return hashlib.md5(unique_string.encode()).hexdigest()
