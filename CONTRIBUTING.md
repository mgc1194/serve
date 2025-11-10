# Contributing to Expenses App

Thank you for your interest in contributing to the Expenses App! This document provides guidelines and instructions for contributing.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/mgc1194/expenses-app.git
cd expenses-app
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run smoke tests to verify setup:
```bash
python test_smoke.py
```

## Code Structure

- `main.py` - Main application entry point with CLI argument parsing
- `config.py` - Configuration settings and environment variable handling
- `utils.py` - Shared utility functions
- `handlers/` - Bank-specific file handlers that route to processing modules
- `<bank_name>/` - Bank-specific transaction processing modules
- `data/` - Directory for input CSV files (not tracked in git)
- `output/` - Directory for generated CSV files (not tracked in git)

## Adding Support for a New Bank

To add support for a new bank:

1. Create a new directory for the bank (e.g., `new_bank/`)

2. Create processing module(s) in that directory with a `process(file_path)` function:
```python
import pandas as pd
from utils import generate_unique_id

def process(file_path):
    # Read CSV file
    df = pd.read_csv(file_path)
    
    # Return standardized DataFrame with columns:
    # ID, Date, Concept, Account, Amount, Label, Owner
    return pd.DataFrame({
        'ID': df.apply(generate_unique_id, axis=1),
        'Date': pd.to_datetime(df['TransactionDate']),
        'Concept': df['Description'],
        'Account': 'Bank Name',
        'Amount': df['Amount'],
        'Label': None,
        'Owner': None
    })
```

3. Create a handler in `handlers/new_bank_handler.py`:
```python
import logging
from new_bank.processor import process as bank_process

def process(file_path):
    try:
        logging.info(f'Processing file: {file_path}')
        return bank_process(file_path)
    except Exception as e:
        logging.error(f'Error processing {file_path}: {e}')
        return None
```

4. Update `config.py` to add the file pattern:
```python
BANK_FILE_PATTERNS = {
    # ... existing patterns ...
    'new_bank': ['unique-pattern-in-filename']
}
```

5. Update `main.py` to import and use the new handler in `read_files()` function

6. Test with sample CSV files from the bank

## Testing

Run the smoke tests before submitting changes:
```bash
python test_smoke.py
```

For manual testing:
```bash
# Test without Google Sheets
python main.py --no-gsheet

# Test with verbose logging
python main.py --no-gsheet --verbose
```

## Code Style

- Follow PEP 8 style guidelines
- Use meaningful variable and function names
- Add docstrings to functions
- Include type hints where helpful
- Keep functions focused and modular

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Make your changes
4. Run tests to ensure nothing broke
5. Commit your changes with clear commit messages
6. Push to your fork
7. Open a Pull Request with a description of changes

## Questions or Issues?

Feel free to open an issue on GitHub for:
- Bug reports
- Feature requests
- Questions about the code
- Documentation improvements

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
