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

### 4. Create database and user

Connect to MySQL as root:
```bash
mysql -u root -p
```

Run these SQL commands to create the database and user:
```sql
CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'serve'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON serve.* TO 'serve'@'localhost';
GRANT ALL PRIVILEGES ON test_serve.* TO 'serve'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. Configure environment variables

Create a file named ".env" in the project root with the following content:

```bash
# Django configuration
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=serve
DB_USER=serve
DB_PASSWORD=your_password
```

Generate a Django secret key with this command:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 6. Run migrations

Apply database migrations:
```bash
cd backend
python manage.py migrate
```

### 7. Create a superuser

Create an admin account:
```bash
python manage.py createsuperuser
```

### 8. Run the development server

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

## Usage

### 1. Set up your data via Django Admin

Visit `http://127.0.0.1:8000/admin/` and create:

1. **Household** (e.g., "Smith Family")
2. **Banks** (e.g., "SoFi", "Capital One")
3. **AccountTypes** for each bank:
   - Name: "SoFi Savings"
   - Handler key: "SoFi Savings" (must match handler in `accounts.py`)
   - Bank: SoFi
4. **Accounts** for your household:
   - Name: "Mario's SoFi Savings" (user-friendly name)
   - Account type: SoFi Savings
   - Household: Smith Family

### 2. Import transactions via API

Use the Swagger UI at `/api/docs` or curl:

```bash
curl -X POST \
  'http://127.0.0.1:8000/api/transactions/import?account_id=1' \
  -F 'file=@SOFI-Savings-2026-01-15.csv'
```

Response:
```json
{
  "filename": "SOFI-Savings-2026-01-15.csv",
  "inserted": 45,
  "skipped": 8,
  "total": 53,
  "error": null
}
```

### 3. Query transactions via Django Admin or ORM

```python
from transactions.models import Transaction

# All transactions for an account
transactions = Transaction.objects.filter(account_id=1)

# Transactions for a household
transactions = Transaction.objects.filter(
    account__household_id=1
).select_related('account')

# Filter by date range
from datetime import date
jan_transactions = Transaction.objects.filter(
    account__household_id=1,
    date__gte=date(2026, 1, 1),
    date__lt=date(2026, 2, 1)
)
```

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

**Database connection errors**
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list           # macOS

# Test connection (will prompt for password)
mysql -u serve -p serve
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