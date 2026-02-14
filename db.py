"""
db.py — Database layer for budget transaction storage (MySQL 8.0).

Handles connection management, schema validation, and upsert logic.
Classifications (label, category, additional_labels) are never overwritten
on re-import — INSERT IGNORE skips any row whose ID already exists.

Usage:
    from db import Database

    with Database.connect() as db:
        db.upsert_transactions(df)
        result_df = db.query_transactions(year=2026)
"""

import os
import logging
import pandas as pd
import mysql.connector
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

@dataclass
class DBConfig:
    """
    Database connection configuration.

    Reads from environment variables by default.

    Environment variables:
        DB_HOST        default: 127.0.0.1
        DB_PORT        default: 3306
        DB_NAME        default: budget
        DB_USER        default: root
        DB_PASSWORD    (required)
    """
    host: str = os.getenv('DB_HOST', '127.0.0.1')
    port: int = int(os.getenv('DB_PORT', 3306))
    database: str = os.getenv('DB_NAME', 'budget')
    user: str = os.getenv('DB_USER', 'root')
    password: str = os.getenv('DB_PASSWORD', '')

    def to_connector_kwargs(self) -> dict:
        return {
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'user': self.user,
            'password': self.password,
        }


# ── Database class ─────────────────────────────────────────────────────────────

class Database:
    """
    Manages a MySQL connection and transaction operations.

    Use as a context manager via Database.connect():

        with Database.connect() as db:
            db.upsert_transactions(df)
            data = db.query_transactions(year=2026)
    """

    # Only these must be present in the incoming DataFrame.
    # label, category, additional_labels are optional — assigned manually later.
    REQUIRED_COLUMNS = {'id', 'date', 'concept', 'account', 'amount'}

    def __init__(self, connection: mysql.connector.MySQLConnection):
        self._conn = connection

    @staticmethod
    @contextmanager
    def connect(config: Optional[DBConfig] = None):
        """
        Context manager that yields a Database instance with an open connection.
        Commits on clean exit, rolls back on exception.
        """
        config = config or DBConfig()
        conn = None
        try:
            conn = mysql.connector.connect(**config.to_connector_kwargs())
            logger.info(
                f"Connected to MySQL database '{config.database}' "
                f"at {config.host}:{config.port}"
            )
            yield Database(conn)
            conn.commit()
        except mysql.connector.Error as e:
            logger.error(f"Could not connect to database: {e}")
            raise
        except Exception:
            if conn and conn.is_connected():
                conn.rollback()
                logger.warning("Transaction rolled back due to error.")
            raise
        finally:
            if conn and conn.is_connected():
                conn.close()

    # ── Upsert ────────────────────────────────────────────────────────────────

    def upsert_transactions(self, df: pd.DataFrame) -> dict:
        """
        Insert new transactions from a DataFrame, ignoring duplicates.

        Uses INSERT IGNORE — rows whose ID already exists are skipped
        entirely, so existing label/category/additional_labels are never
        overwritten.

        Args:
            df: Cleaned DataFrame with at minimum the columns:
                id, date, concept, account, amount.
                May also contain label, category, additional_labels,
                which are written for new rows only.

        Returns:
            dict with keys: 'inserted', 'skipped', 'total'
        """
        self._validate_dataframe(df)

        records = self._prepare_records(df)
        if not records:
            logger.warning("No records to upsert.")
            return {'inserted': 0, 'skipped': 0, 'total': 0}

        sql = """
            INSERT IGNORE INTO transactions
                (id, date, concept, account, amount, label, category, additional_labels)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = [
            (r['id'], r['date'], r['concept'], r['account'], r['amount'],
             r['label'], r['category'], r['additional_labels'])
            for r in records
        ]

        with self._conn.cursor() as cur:
            cur.executemany(sql, values)
            inserted = cur.rowcount  # rows actually inserted (not ignored)

        skipped = len(records) - inserted
        total = len(records)

        logger.info(
            f"Upsert complete — inserted: {inserted}, "
            f"skipped (already exist): {skipped}, "
            f"total: {total}"
        )
        return {'inserted': inserted, 'skipped': skipped, 'total': total}

    # ── Query ─────────────────────────────────────────────────────────────────

    def query_transactions(
            self,
            year: Optional[int] = None,
            month: Optional[int] = None,
            account: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Query transactions with optional filters.

        Args:
            year:    Filter by calendar year.
            month:   Filter by calendar month (1–12).
            account: Filter by account name (exact match).

        Returns:
            DataFrame with columns matching the spreadsheet:
            ID, Date, Concept, Account, Amount, Label, Category, Additional Labels
        """
        conditions = []
        params = []

        if year:
            conditions.append("YEAR(date) = %s")
            params.append(year)
        if month:
            conditions.append("MONTH(date) = %s")
            params.append(month)
        if account:
            conditions.append("account = %s")
            params.append(account)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        sql = f"""
            SELECT id, date, concept, account, amount, label, category, additional_labels
            FROM transactions
            {where_clause}
            ORDER BY date ASC, account ASC
        """

        with self._conn.cursor(dictionary=True) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        df = pd.DataFrame(rows)

        if not df.empty:
            df = df.rename(columns={
                'id': 'ID',
                'date': 'Date',
                'concept': 'Concept',
                'account': 'Account',
                'amount': 'Amount',
                'label': 'Label',
                'category': 'Category',
                'additional_labels': 'Additional Labels',
            })
            df['Date'] = pd.to_datetime(df['Date'])
            df['Amount'] = df['Amount'].astype(float)

        logger.info(f"Queried {len(df)} transactions from database.")
        return df

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _validate_dataframe(self, df: pd.DataFrame):
        """Raise ValueError if any required columns are missing."""
        present = set(df.columns.str.lower())
        missing = self.REQUIRED_COLUMNS - present
        if missing:
            raise ValueError(f"DataFrame is missing required columns: {missing}")

    @staticmethod
    def _prepare_records(df: pd.DataFrame) -> list[dict]:
        """
        Normalize the DataFrame into a list of dicts ready for insertion.
        Lowercases column names and fills in None for optional columns.
        """
        df = df.copy()
        df.columns = df.columns.str.lower().str.replace(' ', '_')

        for optional_col in ('label', 'category', 'additional_labels'):
            if optional_col not in df.columns:
                df[optional_col] = None

        # mysql-connector expects Python date objects, not Timestamps
        if pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = df['date'].dt.date

        return df[
            ['id', 'date', 'concept', 'account', 'amount', 'label', 'category', 'additional_labels']
        ].to_dict('records')
