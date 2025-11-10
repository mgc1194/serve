# Expenses App

A Python application for processing and consolidating financial transaction data from multiple banks and credit cards into a unified format. The app automatically reads CSV files from various financial institutions, standardizes the data, and exports it to CSV files or Google Sheets for easy expense tracking and analysis.

## Features

- **Multi-Bank Support**: Process transactions from 6 different financial institutions:
  - Capital One (Checking, Savings, Quicksilver Credit Card)
  - Chase (Credit Card)
  - American Express (Credit Card)
  - Discover (Credit Card)
  - SoFi (Checking and Savings)
  - Wells Fargo (Checking and Savings)

- **Flexible Configuration**: Configure via command-line arguments, environment variables, or config file
- **Automated Processing**: Automatically detects and processes CSV files based on filename patterns
- **Data Standardization**: Converts different bank CSV formats into a unified structure with consistent fields
- **Duplicate Detection**: Generates unique IDs for each transaction to prevent duplicates
- **Monthly Filtering**: Filter and export transactions by month and year
- **Multiple Export Options**:
  - CSV files organized by year and month
  - Direct export to Google Sheets with automated updates (optional)
- **Comprehensive Logging**: Track processing status with detailed logging
- **Built-in Tests**: Smoke tests to verify functionality

## Quick Start

```bash
# Clone and install
git clone https://github.com/mgc1194/expenses-app.git
cd expenses-app
make install

# Run tests
make test

# Run the app (without Google Sheets)
make run

# Or run with default Python command
python main.py --no-gsheet
```

## Project Structure

```
expenses-app/
├── main.py                          # Main application entry point with CLI
├── config.py                        # Configuration settings
├── utils.py                         # Shared utility functions
├── requirements.txt                 # Python dependencies
├── test_smoke.py                    # Basic smoke tests
├── Makefile                         # Common commands
├── .env.example                     # Example environment configuration
├── CONTRIBUTING.md                  # Contributing guidelines
├── data/                            # Directory for input CSV files
│   └── README.txt
├── handlers/                        # Bank-specific handler modules
│   ├── amex_handler.py             # American Express handler
│   ├── capital_one_handler.py      # Capital One handler
│   ├── chase_handler.py            # Chase handler
│   ├── discover_handler.py         # Discover handler
│   ├── sofi_handler.py             # SoFi handler
│   └── wells_fargo_handler.py      # Wells Fargo handler
├── amex/                           # Amex-specific processing
│   └── amex.py
├── capital_one/                    # Capital One-specific processing
│   ├── checking.py
│   ├── savings.py
│   └── quicksilver.py
├── chase/                          # Chase-specific processing
│   └── chase.py
├── discover/                       # Discover-specific processing
│   └── discover.py
├── sofi/                           # SoFi-specific processing
│   ├── checking.py
│   └── savings.py
├── wells_fargo/                    # Wells Fargo-specific processing
│   ├── checking.py
│   └── savings.py
└── output/                         # Directory for exported CSV files (auto-created)
```

## Prerequisites

- Python 3.7 or higher
- Google Cloud Service Account credentials (for Google Sheets integration)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/mgc1194/expenses-app.git
cd expenses-app
```

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

3. Set up Google Sheets API credentials:
   - Create a Google Cloud Project
   - Enable Google Sheets API and Google Drive API
   - Create a Service Account and download the credentials JSON file
   - Rename the credentials file to `expenses_credentials.json` and place it in the project root
   - Share your Google Sheet with the service account email address

## Configuration

The app can be configured in three ways (in order of priority):

1. **Command-line arguments** (highest priority)
2. **Environment variables** 
3. **Default values in config.py** (lowest priority)

### Environment Variables (Optional)

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
# Edit .env with your preferred settings
export $(cat .env | xargs)  # Load environment variables
```

Available environment variables:
- `EXPENSES_DATA_DIR`: Directory containing input CSV files (default: `./data`)
- `EXPENSES_OUTPUT_DIR`: Directory for output CSV files (default: `./output`)
- `EXPENSES_CREDENTIALS_FILE`: Path to credentials file (default: `expenses_credentials.json`)
- `EXPENSES_YEAR`: Year to process (default: `2025`)
- `EXPENSES_SPREADSHEET_NAME`: Google Spreadsheet name (default: `Copy of Expenses 2025`)

### Google Sheets Setup

1. Create a Google Sheet for your expenses (e.g., "Copy of Expenses 2025")
2. Create worksheets named after months (January, February, etc.)
3. Share the sheet with your service account email (found in `expenses_credentials.json`)

## Usage

### Step 1: Prepare Your Data

Place CSV files from your banks in the `./data` directory. The app recognizes files based on these naming patterns:

**Capital One:**
- Checking: Files containing `360Checking`
- Savings: Files containing `360PerformanceSavings`
- Quicksilver Credit Card: Files containing `transaction_download`

**SoFi:**
- Files containing `SOFI-Checking` or `SOFI-Savings`

**Wells Fargo:**
- Files containing `WF-Checking` or `WF-Savings`

**Chase:**
- Files containing `Chase`

**Discover:**
- Files containing `Discover`

**American Express:**
- Files containing `activity`

### Step 2: Run the Application

#### Basic Usage (with defaults):

```bash
python main.py
```

This will use default settings from `config.py` and environment variables.

#### Advanced Usage with Command-Line Options:

```bash
# Process transactions for a specific year
python main.py --year 2024

# Use a custom data directory
python main.py --data-dir /path/to/csv/files

# Export only to CSV (skip Google Sheets)
python main.py --no-gsheet

# Use a custom Google Spreadsheet name
python main.py --spreadsheet "My Budget 2025"

# Use custom credentials file
python main.py --credentials /path/to/my-credentials.json

# Combine multiple options
python main.py --year 2024 --data-dir ~/Downloads/bank-statements --no-gsheet --verbose

# View all available options
python main.py --help
```


The application will:
1. Read all CSV files from the configured data directory (default: `./data`)
2. Process and standardize transactions from each bank
3. Remove duplicate transactions
4. Filter transactions by month and year
5. Export data to:
   - CSV files in `./output/YYYY/transactions_YYYY_MM.csv`
   - Google Sheets worksheets (one per month) - unless `--no-gsheet` is used

## Output Format

All transactions are standardized to the following format:

| Field | Description |
|-------|-------------|
| ID | Unique identifier (MD5 hash) for duplicate detection |
| Date | Transaction date (datetime format) |
| Concept | Transaction description/merchant |
| Account | Source account name (e.g., "Chase", "CO Checking") |
| Amount | Transaction amount (negative for expenses, positive for income) |
| Label | Optional categorization field |
| Owner | Optional owner field |

## How It Works

### Processing Pipeline

1. **File Detection**: The main script scans the `./data` directory for CSV files
2. **Handler Routing**: Based on filename patterns, files are routed to appropriate handlers
3. **Bank-Specific Processing**: Each bank module parses its unique CSV format
4. **Data Standardization**: All transactions are converted to a unified DataFrame structure
5. **ID Generation**: Unique IDs are generated using MD5 hashing to detect duplicates
6. **Duplicate Removal**: Transactions with identical IDs are filtered out
7. **Date Filtering**: Transactions are filtered by month and year
8. **Export**: Data is exported to CSV files and/or Google Sheets

### Transaction Amount Handling

- **Credit Cards** (Amex, Discover): Amounts are negated (purchases are negative)
- **Bank Accounts**: Debits are negative, credits are positive
- **Capital One Checking**: Uses transaction type to determine sign

## Logging

The application uses Python's logging module to provide detailed information about:
- Files being processed
- Number of transactions found per month
- Errors encountered during processing
- Export success/failure messages

Log messages are output to the console during execution. Use `--verbose` flag for more detailed output.

## Testing

Run the included smoke tests to verify the app is working correctly:

```bash
# Using Makefile
make test

# Or directly with Python
python test_smoke.py
```

The smoke tests verify:
- Configuration loading
- Unique ID generation
- CSV file validation
- Transaction filtering by date
- Empty directory handling

## Error Handling

The application includes comprehensive error handling for:
- File not found errors
- CSV parsing errors
- Empty data files
- Unrecognized file formats
- Google Sheets API errors

Errors are logged but don't stop the processing of other files.

## Extending the App

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions on:
- Adding support for new banks
- Setting up development environment
- Code style guidelines
- Pull request process

### Quick Guide: Adding a New Bank

1. Create a new module in a dedicated directory (e.g., `new_bank/`)
2. Implement a `process(file_path)` function that returns a standardized DataFrame
3. Create a handler in `handlers/new_bank_handler.py`
4. Update `config.py` to add file patterns
5. Update `main.py` to import and use the handler

### Customizing Output

- Modify `export_to_csv()` to change CSV output structure
- Modify `export_to_gsheet()` to change Google Sheets formatting
- Adjust date filtering logic in `filter_transactions_by_date()`

## Development Commands

The included Makefile provides convenient commands:

```bash
make help       # Show all available commands
make install    # Install dependencies
make test       # Run smoke tests
make run        # Run app without Google Sheets
make run-gsheet # Run app with Google Sheets
make clean      # Clean up generated files
make lint       # Check code style (requires pylint)
make format     # Format code (requires black)
```


## Security Notes

- **Never commit** `expenses_credentials.json` to version control
- The `.gitignore` file is configured to exclude credentials and data files
- CSV files in the `./data` directory are automatically excluded from version control

## Troubleshooting

**Issue**: "File not found" errors
- **Solution**: Ensure CSV files are in the `./data` directory with correct naming patterns

**Issue**: Google Sheets authentication errors
- **Solution**: Verify `expenses_credentials.json` is present and the service account has access to the sheet

**Issue**: No transactions processed
- **Solution**: Check that CSV filenames match the expected patterns listed above

**Issue**: Date parsing errors
- **Solution**: Verify the date format in your CSV matches the format expected by each bank's processor

## License

This project is provided as-is for personal use.

## Contributing

This is a personal expense tracking tool. Feel free to fork and modify for your own use.
