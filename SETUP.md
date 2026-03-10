# Setup

👋 This document describes how to set up your workstation to develop for SERVE.

You can do SERVE development on macOS, Ubuntu, or Windows (running Ubuntu via WSL). Make sure you follow the OS-specific instructions in the relevant section below before continuing with the common steps.

## Overview

1. [Clone the repository](#1-clone-the-repository)
2. [Set up a Python virtual environment](#2-set-up-a-python-virtual-environment)
3. [Install frontend dependencies](#3-install-frontend-dependencies)
4. [Install git hooks](#4-install-git-hooks)
5. [Install and configure MySQL](#5-install-and-configure-mysql)
   - [macOS (automated)](#macos-automated)
   - [Ubuntu / Debian (manual)](#ubuntu--debian-manual)
   - [Windows via WSL (manual)](#windows-via-wsl-manual)
6. [Run migrations](#6-run-migrations)
7. [Create a superuser](#7-create-a-superuser)
8. [Start the development servers](#8-start-the-development-servers)

---

## Prerequisites

- Python 3.12 or higher
- Node.js 18 or higher
- pnpm 9 or higher
- MySQL 8.0 or higher
- pip and virtualenv

---

## 1. Clone the repository

```bash
git clone https://github.com/mgc1194/serve.git
cd serve
```

## 2. Set up a Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate       # macOS / Linux / WSL
# .venv\Scripts\activate        # Windows (native, not WSL)
pip install -r requirements/dev.txt
```

## 3. Install frontend dependencies

The frontend uses [pnpm](https://pnpm.io/). Enable it via corepack (bundled with Node.js), then install dependencies:

```bash
corepack enable
cd frontend
pnpm install
cd ..
```

## 4. Install git hooks

The repository includes pre-commit hooks that run ESLint on staged frontend files and ruff on staged backend files, and block direct commits to `main`. Run once after cloning:

```bash
sh scripts/install-hooks.sh
```

<details>
<summary>What the hooks do</summary>

- **protect-main.py** — blocks commits directly to `main`, enforcing the PR workflow
- **lint.py** — runs the appropriate linter only on staged files:
  - `frontend/src/**/*.{ts,tsx}` → ESLint
  - `backend/**/*.{py,pyi}` → ruff format + ruff check

</details>

<details>
<summary>Bypassing hooks</summary>

```bash
git commit --no-verify -m "your message"
```

</details>

## 5. Install and configure MySQL

Choose the path that matches your OS.

### macOS (automated)

```bash
brew install mysql
brew services start mysql
chmod +x setup.sh
./setup.sh
```

`setup.sh` will:
- Create the `serve` and `test_serve` databases
- Create a `serve` MySQL user with a secure auto-generated password
- Write a `.env` file with all required configuration

> **Note:** The script assumes you can connect to MySQL as root without a password (`mysql -u root`). If your installation requires a root password, use the manual steps below instead.

Skip to [step 6](#6-run-migrations).

---

### Ubuntu / Debian (manual)

Install MySQL:

```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

Create the databases and user. Replace `your_password` with a strong password of your choice:

```bash
sudo mysql -u root
```

```sql
CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE test_serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'serve'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON serve.* TO 'serve'@'localhost';
GRANT ALL PRIVILEGES ON test_serve.* TO 'serve'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Generate a Django secret key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Create a `.env` file in the project root, substituting your values:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=serve
DB_USER=serve
DB_PASSWORD=your_password

DJANGO_SECRET_KEY=your_generated_secret_key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
```

Skip to [step 6](#6-run-migrations).

---

### Windows via WSL (manual)

Windows Subsystem for Linux (WSL) is the recommended way to run SERVE on Windows. WSL 2 is required — WSL 1 has known issues with MySQL.

**Enable WSL 2** (run PowerShell as Administrator):

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Restart your machine, then:

```powershell
wsl --set-default-version 2
```

Install [Ubuntu 22.04 from the Microsoft Store](https://apps.microsoft.com/detail/9PN20MSR04DW), launch it from the Start menu, and complete the initial user setup.

> **Clock skew:** WSL can have a clock drift issue that causes `apt update` and SSL errors. If you run into either, sync your clock first: `sudo hwclock -s`

Inside your WSL Ubuntu terminal, install MySQL:

```bash
sudo apt update
sudo apt install mysql-server
sudo service mysql start
```

> **WSL note:** Use `sudo service mysql start` rather than `systemctl` — systemd is not available in all WSL configurations.

Connect to MySQL and create the databases and user. Replace `your_password` with a strong password:

```bash
sudo mysql -u root
```

```sql
CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE test_serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'serve'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON serve.* TO 'serve'@'localhost';
GRANT ALL PRIVILEGES ON test_serve.* TO 'serve'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

<details>
<summary>Troubleshoot: <code>Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock'</code></summary>

This is a known WSL issue with socket-based MySQL connections. Restart MySQL and ensure you connect via TCP by setting `DB_HOST=127.0.0.1` (not `localhost`) in your `.env`.

```bash
sudo service mysql restart
```

</details>

Generate a Django secret key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Create a `.env` file in the project root:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=serve
DB_USER=serve
DB_PASSWORD=your_password

DJANGO_SECRET_KEY=your_generated_secret_key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
```

> **Before continuing:** restart MySQL before running migrations: `sudo service mysql start`

---

## 6. Run migrations

```bash
cd backend
python manage.py migrate
```

## 7. Create a superuser

```bash
python manage.py createsuperuser
```

## 8. Start the development servers

Backend (from `backend/`):

```bash
python manage.py runserver
```

Frontend (from `frontend/`):

```bash
pnpm dev
```

The API is available at `http://localhost:8000` and the frontend at `http://localhost:5173`.

---

## Running tests

Backend:

```bash
cd backend
python -m pytest
```

Frontend:

```bash
cd frontend
pnpm test
```

---

## Troubleshooting

**Database connection errors**

```bash
# Check MySQL is running
sudo systemctl status mysql   # Ubuntu (native)
sudo service mysql status     # WSL
brew services list            # macOS

# Test connection
mysql -u serve -p serve
```

If you get "Access denied" errors, try setting `DB_HOST=localhost` in `.env`, or create the user explicitly for `127.0.0.1`:

```sql
mysql -u root
CREATE USER 'serve'@'127.0.0.1' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON serve.* TO 'serve'@'127.0.0.1';
GRANT ALL PRIVILEGES ON test_serve.* TO 'serve'@'127.0.0.1';
FLUSH PRIVILEGES;
```

**Recreate databases without regenerating `.env`**

```bash
mysql -u root
DROP DATABASE IF EXISTS serve;
DROP DATABASE IF EXISTS test_serve;
CREATE DATABASE serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE test_serve CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

cd backend
python manage.py migrate
```

**Reset everything and start from scratch**

```bash
mysql -u root <<EOF
DROP DATABASE IF EXISTS serve;
DROP DATABASE IF EXISTS test_serve;
DROP USER IF EXISTS 'serve'@'localhost';
EOF

rm .env
./setup.sh          # macOS only — follow manual steps for Ubuntu / WSL
cd backend
python manage.py migrate
python manage.py createsuperuser
```

**Migration errors**

```bash
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

# Run with verbose output
python -m pytest -vv --tb=short
```
