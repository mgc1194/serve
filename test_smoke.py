#!/usr/bin/env python3
"""
Basic smoke tests for the Expenses App.

These tests verify that the core functionality works without requiring
actual bank CSV files or Google Sheets credentials.
"""

import sys
import os
import pandas as pd
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from main import filter_transactions_by_date, read_files
from utils import generate_unique_id, validate_csv_file


def test_config_module():
    """Test that config module loads correctly."""
    print("Testing config module...")
    assert hasattr(config, 'DATA_DIR')
    assert hasattr(config, 'OUTPUT_DIR')
    assert hasattr(config, 'CREDENTIALS_FILE')
    assert hasattr(config, 'BANK_FILE_PATTERNS')
    print("✓ Config module loaded successfully")


def test_generate_unique_id():
    """Test unique ID generation."""
    print("Testing unique ID generation...")
    
    # Create a sample row
    sample_data = pd.Series({
        'Date': '2025-01-15',
        'Description': 'Test Transaction',
        'Amount': 100.00
    })
    
    id1 = generate_unique_id(sample_data)
    id2 = generate_unique_id(sample_data)
    
    # Same data should generate same ID
    assert id1 == id2, "Same data should generate same ID"
    
    # Different data should generate different ID
    sample_data2 = sample_data.copy()
    sample_data2['Amount'] = 200.00
    id3 = generate_unique_id(sample_data2)
    
    assert id1 != id3, "Different data should generate different ID"
    print("✓ Unique ID generation works correctly")


def test_validate_csv_file():
    """Test CSV file validation."""
    print("Testing CSV file validation...")
    
    # Test with non-existent file
    assert not validate_csv_file('/nonexistent/file.csv')
    
    # Test with non-CSV file
    assert not validate_csv_file(__file__)  # This .py file
    
    print("✓ CSV file validation works correctly")


def test_filter_transactions_by_date():
    """Test transaction filtering by date."""
    print("Testing transaction filtering...")
    
    # Create sample transaction data
    sample_transactions = pd.DataFrame({
        'ID': ['id1', 'id2', 'id3', 'id4'],
        'Date': pd.to_datetime([
            '2025-01-15',
            '2025-02-20',
            '2025-01-25',
            '2024-12-10'
        ]),
        'Concept': ['Transaction 1', 'Transaction 2', 'Transaction 3', 'Transaction 4'],
        'Account': ['Test', 'Test', 'Test', 'Test'],
        'Amount': [100, 200, 300, 400],
        'Label': [None, None, None, None],
        'Owner': [None, None, None, None]
    })
    
    # Filter by year
    filtered = filter_transactions_by_date(sample_transactions, target_year=2025)
    assert len(filtered) == 3, f"Expected 3 transactions for 2025, got {len(filtered)}"
    
    # Filter by month and year
    filtered = filter_transactions_by_date(sample_transactions, target_month=1, target_year=2025)
    assert len(filtered) == 2, f"Expected 2 transactions for January 2025, got {len(filtered)}"
    
    # Filter by month only
    filtered = filter_transactions_by_date(sample_transactions, target_month=12)
    assert len(filtered) == 1, f"Expected 1 transaction for December, got {len(filtered)}"
    
    print("✓ Transaction filtering works correctly")


def test_read_files_empty_directory():
    """Test reading from empty directory."""
    print("Testing read_files with empty/non-existent directory...")
    
    # Create a temporary empty directory
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        result = read_files(tmpdir)
        assert result.empty, "Empty directory should return empty DataFrame"
    
    print("✓ Empty directory handling works correctly")


def run_all_tests():
    """Run all smoke tests."""
    print("\n" + "="*60)
    print("Running Expenses App Smoke Tests")
    print("="*60 + "\n")
    
    tests = [
        test_config_module,
        test_generate_unique_id,
        test_validate_csv_file,
        test_filter_transactions_by_date,
        test_read_files_empty_directory
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} errored: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
