# Expenses App

A Python application for processing and consolidating financial transaction data from multiple banks and credit cards into a unified MySQL database. The app automatically reads CSV files from various financial institutions, standardizes the data, stores it in a MySQL database with duplicate prevention, and exports it to Google Sheets for easy expense tracking and analysis.

## Features

- **Multi-Bank Support**: Process transactions from 6 different financial institutions:
  - Capital One (Checking, Savings, Quicksilver Credit Card)
  - Chase (Credit Card)
  - American Express (Credit Card - Delta)
  - Discover (Credit Card)
  - SoFi (Checking and Savings)
  - Wells Fargo (Checking and Savings)

- **MySQL Database Storage**: All transactions are stored in a MySQL 8.0 database with proper indexing
- **Automated Processing**: Automatically detects and processes CSV files based on filename patterns
- **Data Standardization**: Converts different bank CSV formats into a unified structure with consistent fields
- **Duplicate Detection**: Generates unique MD5-based IDs for each transaction to prevent duplicates on re-import
- **Label Preservation**: Manually assigned labels, categories, and additional labels are never overwritten on re-import
- **Database Querying**: Query transactions by year, month, or account with efficient indexed lookups
- **Google Sheets Export**: Export database transactions directly to Google Sheets with automated updates
- **Comprehensive Logging**: Track processing status with detailed logging

## Project Structure

```
expenses-app/
├── main.py                          # Main application entry point
├── db.py                            # Database layer for MySQL connection and operations
├── migration.sql                    # Database schema initialization script
├── data/                            # Directory for input CSV files (organize by year)
│   └── 2026/                       # Year-specific subfolder
├── handlers/                        # Bank-specific handler modules
│   ├── __init__.py
│   ├── base.py                     # Base handler class with common logic
│   └── accounts.py                 # All account-specific handlers and registry
└── .gitignore                      # Excludes credentials, data, and build artifacts
```

## Prerequisites

- Python 3.7 or higher
- MySQL 8.0 or higher
- Google Cloud Service Account credentials (for Google Sheets integration)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/mgc1194/expenses-app.git
cd expenses-app
```

### 2. Install MySQL

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**On macOS (using Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**On Windows:**
- Download MySQL 8.0 installer from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
- Run the installer and follow the setup wizard
- Make note of your root password during installation

### 3. Create and configure the database

```bash
# Log into MySQL as root
mysql -u root -p

# Run the migration script to create the database and table
source migration.sql

# Or, alternatively:
mysql -u root -p < migration.sql
```

This will create:
- A database named `budget` (configured in migration.sql)
- A `transactions` table with proper schema and indexes
- Indexes on date, category, and label columns for efficient querying

### 4. Install Python dependencies
```bash
pip install pandas gspread google-auth mysql-connector-python
```

### 5. Set up Google Sheets API credentials
   - Create a Google Cloud Project
   - Enable Google Sheets API and Google Drive API
   - Create a Service Account and download the credentials JSON file
   - Rename the credentials file to `expenses_credentials.json` and place it in the project root
   - Share your Google Sheet with the service account email address

## Configuration

### Database Configuration

The application reads database connection settings from environment variables. You can set these in your shell or create a `.env` file:

```bash
# Database connection settings (defaults shown)
export DB_HOST=127.0.0.1          # MySQL host
export DB_PORT=3306               # MySQL port
export DB_NAME=budget             # Database name (must match migration.sql)
export DB_USER=root               # MySQL username
export DB_PASSWORD=your_password  # MySQL password (required)
```

**Important:** Never commit your database password to version control. The `.gitignore` file excludes `.env` files.

### Google Sheets Setup

1. Create a Google Sheet for your expenses (e.g., "2026 Budget")
2. Create a worksheet named "Transactions" (or your preferred name)
3. Share the sheet with your service account email (found in `expenses_credentials.json`)

### Modify Script Settings

Edit `main.py` to configure:
- `source_path`: Directory containing input CSV files (default: `./data/2026`)
- `current_year`: Year to process (default: `2026`)
- In the `export_to_gsheet()` function call (line 145):
  - First parameter: Spreadsheet name (e.g., `'2026 Budget'`)
  - Second parameter: Worksheet name (e.g., `'Transactions'`)

## Usage

### Step 1: Prepare Your Data

Organize CSV files from your banks in the `./data` directory by year. For example:
```
data/
└── 2026/
    ├── 360Checking_January.csv
    ├── transaction_download.csv
    ├── SOFI-Checking.csv
    └── ...
```

The app recognizes files based on these naming patterns:

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

**American Express (Delta):**
- Files containing `activity`

### Step 2: Run the Application

```bash
# Set database password if not already in environment
export DB_PASSWORD=your_mysql_password

# Run the application
python main.py
```

The application will:
1. Read all CSV files from the configured source directory
2. Process and standardize transactions from each bank
3. Insert new transactions into the MySQL database (duplicates are automatically skipped)
4. Query transactions for the current year from the database
5. Export data to Google Sheets

## Output Format

All transactions are standardized to the following format in the database:

| Field | Description |
|-------|-------------|
| id | Unique identifier (MD5 hash) for duplicate detection - PRIMARY KEY |
| date | Transaction date (DATE format) |
| concept | Transaction description/merchant (TEXT) |
| account | Source account name (e.g., "Chase", "CO Checking") |
| amount | Transaction amount (DECIMAL 12,2 - negative for expenses, positive for income) |
| label | Optional categorization field (manually assigned, never overwritten) |
| category | Optional category field (manually assigned, never overwritten) |
| additional_labels | Optional comma-separated tags (manually assigned, never overwritten) |
| imported_at | Timestamp of when the transaction was first imported (auto-generated) |

## How It Works

### Processing Pipeline

1. **File Detection**: The main script scans the configured data directory for CSV files
2. **Handler Routing**: Based on filename patterns, files are routed to appropriate handlers from the registry
3. **Bank-Specific Processing**: Each handler (subclass of `BaseHandler`) parses its unique CSV format
4. **Data Standardization**: All transactions are converted to a unified DataFrame structure
5. **ID Generation**: Unique IDs are generated using MD5 hashing of all raw CSV columns
6. **Database Upsert**: Transactions are inserted into MySQL using `INSERT IGNORE` (duplicates are automatically skipped)
7. **Query**: Transactions are queried from the database by year/month/account
8. **Export**: Data is exported to Google Sheets

### Transaction Amount Handling

- **Credit Cards** (Amex/Delta, Discover): Amounts are negated (purchases are negative)
- **Bank Accounts**: Debits are negative, credits are positive
- **Capital One Accounts**: Uses transaction type column to determine sign (Credit/Debit)
- **Quicksilver**: Calculates amount from separate Credit and Debit columns

### Label Preservation

The database schema is designed to preserve manual classifications:
- `label`, `category`, and `additional_labels` are optional columns
- On re-import, the `INSERT IGNORE` strategy skips any transaction whose ID already exists
- This means manually assigned labels are never overwritten, even if you re-import the same CSV files

## Logging

The application uses Python's logging module to provide detailed information about:
- Files being processed
- Number of transactions found per month
- Errors encountered during processing
- Export success/failure messages

Log messages are output to the console during execution.

## Error Handling

The application includes comprehensive error handling for:
- File not found errors
- CSV parsing errors
- Empty data files
- Unrecognized file formats
- Google Sheets API errors

Errors are logged but don't stop the processing of other files.

## Extending the App

### Adding a New Bank

1. Open `handlers/accounts.py`
2. Create a new handler class that inherits from `BaseHandler`:
   ```python
   class NewBankHandler(BaseHandler):
       account = 'New Bank Name'           # Display name
       date_format = '%Y-%m-%d'            # Date format in CSV
       col_date = 'Date'                   # Date column name
       col_concept = 'Description'         # Description column name
       col_amount = 'Amount'               # Amount column name
       negate_amount = False               # Set True for credit cards
   ```
3. Add the handler to `ACCOUNT_HANDLERS` registry at the bottom of `accounts.py`
4. Update `FILE_ACCOUNT_MAP` in `main.py` to map filename patterns to the account key
5. Test with a sample CSV file

### Advanced Handler Customization

For banks with complex CSV formats:
- Override `_apply_amount_logic()` for custom amount calculation (see Capital One examples)
- Set `csv_names` and `csv_header=None` for headerless CSVs (see Wells Fargo examples)
- Adjust `encoding` if the CSV uses non-standard encoding

### Customizing Database Queries

The `Database.query_transactions()` method supports filtering:
```python
with Database.connect() as db:
    # Query specific month
    jan_data = db.query_transactions(year=2026, month=1)
    
    # Query specific account
    chase_data = db.query_transactions(account='Chase')
    
    # Combine filters
    chase_jan = db.query_transactions(year=2026, month=1, account='Chase')
```

## Security Notes

- **Never commit** `expenses_credentials.json` to version control
- **Never commit** your MySQL password or `.env` files to version control
- The `.gitignore` file is configured to exclude credentials, environment files, and data files
- CSV files in the `./data` directory are automatically excluded from version control
- Store database credentials in environment variables, not in code
- Use strong passwords for your MySQL database
- Consider setting up a dedicated MySQL user with limited privileges for this application

## Troubleshooting

**Issue**: "Could not connect to database" errors
- **Solution**: Verify MySQL is running: `sudo systemctl status mysql` (Linux) or `brew services list` (macOS)
- **Solution**: Check your database credentials in environment variables
- **Solution**: Ensure the database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- **Solution**: Verify the database name matches `DB_NAME` environment variable (default: `budget`)

**Issue**: "File not found" errors
- **Solution**: Ensure CSV files are in the configured data directory with correct naming patterns
- **Solution**: Check that `source_path` in `main.py` points to the correct directory

**Issue**: Google Sheets authentication errors
- **Solution**: Verify `expenses_credentials.json` is present and the service account has access to the sheet
- **Solution**: Ensure the service account email has "Editor" permissions on the Google Sheet

**Issue**: No transactions processed
- **Solution**: Check that CSV filenames match the expected patterns listed above
- **Solution**: Review log output for specific file processing errors

**Issue**: Date parsing errors
- **Solution**: Verify the date format in your CSV matches the format expected by each bank's handler
- **Solution**: Check the `date_format` attribute in the corresponding handler class

**Issue**: Duplicate transactions keep getting imported
- **Solution**: This shouldn't happen - check that the ID generation is working correctly
- **Solution**: Verify the `id` column is the PRIMARY KEY in your database schema

**Issue**: Labels/categories are being overwritten on re-import
- **Solution**: This shouldn't happen with `INSERT IGNORE` - check that you're not manually deleting and re-inserting transactions
- **Solution**: Verify the migration.sql schema was applied correctly

## License

This project is provided as-is for personal use.

## Contributing

This is a personal expense tracking tool. Feel free to fork and modify for your own use.
