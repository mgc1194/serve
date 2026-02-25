# SERVE

Spending, Earnings, & Resources View Engine
A Django-based web application for processing and consolidating financial transaction data from multiple banks and credit cards. The app provides a REST API for uploading CSV files, automatically detects bank formats, and stores transactions in a MySQL database with duplicate prevention.

## Features

- **Multi-Bank Support**: Process transactions from multiple financial institutions:
  - Capital One
  - Chase
  - American Express
  - Discover
  - SoFi
  - Wells Fargo

- **Django Backend**: REST API built with Django Ninja for fast, type-safe endpoints
- **MySQL Database Storage**: All transactions stored with proper indexing and relationships
- **Multi-Household Support**: Multiple users can share access to the same financial data
- **Account Type System**: Banks, account types, and user accounts are modeled as separate entities
- **Automated CSV Processing**: Upload CSVs via API, automatic bank detection from filename
- **Duplicate Prevention**: MD5-based transaction IDs prevent duplicate imports
- **Label Preservation**: Manually assigned labels, categories, and tags are never overwritten
- **Comprehensive Testing**: Full test coverage with pytest for handlers, models, and API

## Architecture

The project is organized as a Django monorepo with the following structure:

**Backend directory** contains the Django application:
- `manage.py` - Django management script
- `config/` - Django settings and URL configuration
  - `settings.py` - Application settings
  - `urls.py` - URL routing
- `users/` - User and household management
  - `models.py` - CustomUser and Household models
  - `tests/` - User model tests
- `transactions/` - Core transaction functionality
  - `models.py` - Bank, AccountType, Account, and Transaction models
  - `api.py` - REST API endpoints using Django Ninja
  - `utils.py` - Filename detection and bulk upsert utilities
  - `handlers/` - Bank-specific CSV parsing logic
    - `base.py` - Base handler class
    - `accounts.py` - All bank-specific handlers
  - `tests/` - Comprehensive test suite
    - `test_models.py` - Model tests
    - `test_api.py` - API endpoint tests
    - `test_utils.py` - Utility function tests
    - `handlers/` - Handler tests

**Frontend directory** is reserved for the React application (coming soon)

**Requirements directory** contains Python dependencies:
- `base.txt` - Production dependencies
- `dev.txt` - Development and testing dependencies

## Prerequisites

- Python 3.12 or higher
- MySQL 8.0 or higher
- pip and virtualenv

## Installation

### 1. Clone the repository

Command to clone the repository:
```bash
git clone https://github.com/mgc1194/serve.git
cd serve
```

### 2. Set up Python virtual environment

Commands to create and activate a virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements/dev.txt
```

### 3. Install and configure MySQL

On Ubuntu or Debian systems:
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

On macOS using Homebrew:
```bash
brew install mysql
brew services start mysql
```

### 4. Run the setup script

The setup script creates the databases, user, and generates secure passwords automatically:

```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Create `serve` and `test_serve` databases
- Create the `serve` database user with a secure auto-generated password
- Generate a `.env` file with all required configuration
- Generate a secure Django secret key

**Note:** The script assumes you can connect to MySQL as root without a password (`mysql -u root`). If your MySQL installation requires a root password, you'll need to modify the script or run the SQL commands manually.

### 5. Run migrations

Apply database migrations:
```bash
cd backend
python manage.py migrate
```

### 6. Create a superuser

Create an admin account:
```bash
python manage.py createsuperuser
```

### 7. Run the development server

Start the Django development server:
```bash
python manage.py runserver
```

The API will be available at: http://127.0.0.1:8000/api/

## API Documentation

Django Ninja provides auto-generated interactive API documentation:

- **Swagger UI**: `http://127.0.0.1:8000/api/docs`
- **Django Admin**: `http://127.0.0.1:8000/admin/`

### Available Endpoints

**GET /api/banks**
- List all banks with their account types
- Used to populate account selection dropdowns

**GET /api/accounts?household_id={id}**
- List all accounts for a household
- Returns account name, type, bank, and handler key

**GET /api/accounts/detect?filename={filename}**
- Detect account type from CSV filename
- Returns suggested handler key for confirmation

**POST /api/transactions/import?account_id={id}**
- Upload and import a CSV file
- Multipart form data with `file` field
- Returns counts: inserted, skipped, total, errors

## Data Model

### Core Entities

**Household** — Group of users sharing financial data
- Multiple users can belong to multiple households

**Bank** — Financial institution (Capital One, SoFi, etc.)
- Has multiple account types

**AccountType** — Product offered by a bank (e.g., "360 Performance Savings")
- Links to specific CSV handler via `handler_key`

**Account** — User's specific account instance (e.g., "Mario's SoFi Savings")
- Belongs to one household and one account type
- User-assigned name to distinguish multiple accounts of same type

**Transaction** — Individual financial transaction
- MD5-based ID for duplicate detection
- Links to account (and through it, to household)
- Labels/categories preserved on re-import


## Testing

The project has comprehensive test coverage:

```bash
# Run all tests
cd backend
python -m pytest -v

# Run specific test modules
python -m pytest transactions/tests/test_api.py -v
python -m pytest transactions/tests/test_models.py -v
python -m pytest transactions/tests/handlers/ -v

# With coverage report
python -m pytest --cov=transactions --cov-report=html
```

Tests cover:
- ✅ Handler CSV parsing logic (all supported accounts)
- ✅ Django models (relationships, constraints, validation)
- ✅ API endpoints (success, errors, edge cases)
- ✅ Utility functions (detection, bulk upsert)

## CSV File Naming Patterns

The app detects account types from these filename patterns:

| Bank | Account Type | Filename Pattern |
|------|-------------|------------------|
| Capital One | Checking | `360Checking` |
| Capital One | Savings | `360PerformanceSavings` |
| Capital One | Quicksilver | `transaction_download` |
| SoFi | Checking | `SOFI-Checking` |
| SoFi | Savings | `SOFI-Savings` |
| Wells Fargo | Checking | `WF-Checking` |
| Wells Fargo | Savings | `WF-Savings` |
| Chase | Credit Card | `Chase` |
| Discover | Credit Card | `Discover` |
| Amex | Delta | `activity` |

## Adding a New Bank

1. **Create the handler** in `backend/transactions/handlers/accounts.py`:

```python
class NewBankHandler(BaseHandler):
    account       = 'New Bank'
    date_format   = '%Y-%m-%d'
    col_date      = 'Date'
    col_concept   = 'Description'
    col_amount    = 'Amount'
    negate_amount = False  # Set True for credit cards
```

2. **Add to handler registry**:

```python
ACCOUNT_HANDLERS = {
    # ... existing handlers ...
    'New Bank Checking': NewBankHandler(),
}
```

3. **Add to filename detection** in `backend/transactions/utils.py`:

```python
FILE_DETECTION_MAP = {
    # ... existing patterns ...
    'NewBank': 'New Bank Checking',
}
```

4. **Create Bank and AccountType** via Django admin

5. **Write tests** in `backend/transactions/tests/handlers/test_accounts.py`

## Security

- ✅ All database queries use Django ORM (SQL injection protected)
- ✅ File uploads processed in-memory only (not saved to disk)
- ✅ Environment variables for secrets (never committed)
- ⚠️ **No built-in authentication/authorization in this repo yet**
- This backend must be treated as **development/local-only** in its default configuration.
- **Do not** expose the Django app or its `/api/...` endpoints directly to the public internet or any untrusted network without adding server-side auth.
- For any non-local or production use, you **must**:
- - Enable server-side authentication (e.g., Django auth with session or token-based login, or an OAuth/OpenID Connect integration), and
- - Enforce per-endpoint authorization, tying `household_id` / `account_id` etc. to `request.user` and checking access before returning or mutating data.
- Any reverse-proxy/front-end checks should be treated as additional layers, **not** a replacement for backend access control.
- ⚠️ No file size limits (should add before production)
- ⚠️ No rate limiting (should add before production)

## Troubleshooting

*Database connection errors**
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list           # macOS

# Test connection (will prompt for password)
mysql -u serve -p serve
```

**Recreate databases without regenerating .env**

If you need to drop and recreate the databases but want to keep your existing `.env` file and credentials:

```bash
# Connect to MySQL as root
mysql -u root

# Run these commands:
DROP DATABASE IF EXISTS serve;
DROP DATABASE IF EXISTS test_serve;
CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE test_serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Re-run migrations
cd backend
python manage.py migrate
```

**Reset everything and start from scratch**

If you want to completely reset the project (databases, user, and credentials):

```bash
# 1. Drop databases and user
mysql -u root <<EOF
DROP DATABASE IF EXISTS serve;
DROP DATABASE IF EXISTS test_serve;
DROP USER IF EXISTS 'serve'@'localhost';
EOF

# 2. Remove .env file
rm .env

# 3. Re-run setup
./setup.sh
cd backend
python manage.py migrate
python manage.py createsuperuser
```

**Migration errors**
```bash
# Run from repository root
# Reset migrations (development only)
python backend/manage.py migrate transactions zero
rm backend/transactions/migrations/0001_initial.py
python backend/manage.py makemigrations
python backend/manage.py migrate
```

**Test failures**
```bash
# Clear bytecode cache
find backend -type d -name __pycache__ -exec rm -rf {} +

# Run tests with verbose output
python -m pytest -vv --tb=short
```

## License

This project is provided as-is for personal use.

## Contributing

Feel free to fork and modify for your own use. PRs welcome for bug fixes and improvements.