# SERVE

Spending, Earnings, & Resources View Engine — a Django + React web application for processing and consolidating financial transaction data from multiple banks and credit cards.

## Quick start

1. Follow the [setup guide](./SETUP.md) to configure your workstation.
2. `cd backend && python manage.py runserver` to start the API server.
3. `cd frontend && npm run dev` to start the frontend.
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to help

PRs welcome for bug fixes and improvements. See the [setup guide](./SETUP.md) for how to get your environment running.

## What's in this repo?

### Documentation

- [SETUP](./SETUP.md): Instructions to get everything up and running.
- [LICENSE](./LICENSE)

### [backend](./backend)

The Django REST API, responsible for:

- User accounts and household management
- Bank, account type, and account configuration
- CSV transaction imports with automatic bank detection
- Duplicate prevention via MD5-based transaction IDs
- Label and category preservation across re-imports

Built with [Django Ninja](https://django-ninja.dev/) for fast, type-safe endpoints, backed by MySQL.

### [frontend](./frontend)

The React application, responsible for:

- Household and account management UI
- Transaction browsing and labeling
- CSV upload interface

Built with React + TypeScript + Vite.

### [scripts](./scripts)

Developer utilities, including git hooks that enforce linting on staged files and block direct commits to `main`.

## Architecture

```
serve/
├── backend/
│   ├── config/               # Django settings and URL routing
│   ├── users/                # CustomUser and Household models
│   ├── transactions/         # Core transaction logic, API, handlers
│   └── requirements/         # Python dependencies
├── frontend/
│   └── src/                  # React + TypeScript application
└── scripts/                  # Git hooks and dev tooling
```

## License

This project is provided as-is for personal use.
