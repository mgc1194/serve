"""
Utility functions shared across the Expenses App.

This module contains common utility functions used by multiple modules
in the application.
"""

import hashlib
import pandas as pd


def generate_unique_id(row):
    """
    Generate a unique MD5 hash ID for a transaction row.
    
    This function is used to identify duplicate transactions across
    different bank statement imports.
    
    Args:
        row (pd.Series): A row from a DataFrame
        
    Returns:
        str: MD5 hash of the row data
    """
    unique_string = '_'.join(row.astype(str))
    return hashlib.md5(unique_string.encode()).hexdigest()


def validate_csv_file(file_path):
    """
    Validate that a file exists and is a CSV file.
    
    Args:
        file_path (str): Path to the file to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    import os
    
    if not os.path.exists(file_path):
        return False
    
    if not file_path.lower().endswith('.csv'):
        return False
    
    return True


def safe_read_csv(file_path, **kwargs):
    """
    Safely read a CSV file with error handling.
    
    Args:
        file_path (str): Path to CSV file
        **kwargs: Additional arguments to pass to pd.read_csv
        
    Returns:
        pd.DataFrame or None: DataFrame if successful, None if error
    """
    try:
        return pd.read_csv(file_path, **kwargs)
    except FileNotFoundError:
        return None
    except pd.errors.EmptyDataError:
        return None
    except pd.errors.ParserError:
        return None
    except Exception:
        return None
