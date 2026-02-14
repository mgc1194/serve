"""
tests/conftest.py — Shared fixtures for handler unit tests.
"""

import pandas as pd


# ── Expected output columns ───────────────────────────────────────────────────

EXPECTED_COLUMNS = ['ID', 'Date', 'Concept', 'Account', 'Amount', 'Label', 'Category', 'Additional Labels']


# ── Handler output assertions ─────────────────────────────────────────────────

def assert_clean_dataframe(df, expected_account, expected_rows=1):
    """Reusable assertions for any handler output DataFrame."""
    assert df is not None, "Handler returned None"
    assert list(df.columns) == EXPECTED_COLUMNS, f"Unexpected columns: {df.columns.tolist()}"
    assert len(df) == expected_rows, f"Expected {expected_rows} rows, got {len(df)}"
    assert df['Account'].iloc[0] == expected_account
    assert pd.api.types.is_datetime64_any_dtype(df['Date']), "Date column is not datetime"
    assert df['ID'].str.len().eq(32).all(), "All IDs should be 32-char MD5 hashes"
    assert df['Label'].iloc[0] is None, "Label should be None on import"
    assert df['Category'].iloc[0] is None, "Category should be None on import"
    assert df['Additional Labels'].iloc[0] is None, "Additional Labels should be None on import"

