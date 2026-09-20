# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SERVE (Spending, Earnings, & Resources View Engine) — a Django + React app for importing, deduplicating, and
labeling financial transactions from multiple banks/credit cards, organized around households (a group of users
sharing accounts and budgets).

- `backend/` — Django REST API using Django Ninja, backed by MySQL.
- `frontend/` — React + TypeScript + Vite SPA.

## Commands

### Backend (run from `backend/`)

```bash
python manage.py runserver              # dev server (localhost:8000)
python manage.py migrate                # apply migrations
python manage.py makemigrations <app>   # create migrations for one app
python -m pytest                        # run all tests
python -m pytest tests/budgets/test_models.py::TestCategory::test_str  # single test
python -m pytest -vv --tb=short         # verbose, short tracebacks
ruff check .                            # lint
ruff format .                           # format
```

Tests require the `test_serve` MySQL database and a `.env` in the repo root (see `SETUP.md`). `pytest.ini` sets
`testpaths = tests transactions/tests`, so new test suites should live under `backend/tests/<app>/`, mirroring
the app being tested (e.g. `tests/budgets/` for `budgets/`), with shared fixtures added to `tests/conftest.py`
and model factories in `tests/factories/`.

### Frontend (run from `frontend/`)

```bash
pnpm dev                  # dev server (localhost:5173), proxies /api to Django on :8000
pnpm build                # tsc -b && vite build
pnpm lint                 # eslint src tests
pnpm tsc --noEmit         # type check only (what CI runs)
pnpm test                 # vitest watch mode
pnpm test --run           # vitest, single run (what CI runs)
pnpm test:unit            # src/**/*.test.* only
pnpm test:integration     # tests/integration only
pnpm test:coverage
pnpm storybook            # component explorer on :6006
```

To run a single test file: `pnpm vitest run src/pages/summary/date-utils.test.ts`.

## Architecture

### Backend: apps and boundaries

- `users/` — `CustomUser` (email as login identifier, always lowercased) and `Household` (a group of users
  sharing accounts/data). Most authorization checks are "is this user a member of the household that owns
  this resource" via `household.users.filter(pk=user.pk).exists()`.
- `banking/` — `Bank`, `AccountType`, `Account`, and the CSV-parsing handler registry
  (`banking/handlers/`). System-defined only: adding a new supported account requires a new `BaseHandler`
  subclass in `banking/handlers/accounts.py`, registration in `ACCOUNT_HANDLERS`, a new key in
  `banking/constants.py::HandlerKeys`, and a data migration seeding the `AccountType` row. Users cannot
  define their own account types.
- `transactions/` — `Label` and `Transaction` models, plus the import-time upsert logic in
  `transactions/utils.py`. Depends on `banking.Account` via FK only.
- `budgets/` — `Category`, a household-level taxonomy (soft-delete via `is_active`, never hard-deleted since
  it will become a `PROTECT` FK target for future `BudgetLine` rows). Newest app, still growing — check
  `budgets/models.py` docstrings for the planned shape before extending it.
- `config/` — settings, URL routing, and `config/api.py`, which is the **single shared `NinjaAPI` instance**.
  All versioned routers (`api/v1/*.py`) are registered there and mounted once in `config/urls.py` — do not
  instantiate a second `NinjaAPI()`.
- `api/v1/` — one router module per resource area (`auth.py`, `banking.py`, `households.py`, `labels.py`,
  `summary.py`, `transactions.py`). `schemas/` holds the matching Ninja/Pydantic schemas, one file per
  resource area, mirroring `api/v1/`.

Cross-cutting conventions worth knowing before writing backend code:
- Transactions are deduplicated via a SHA-256 `dedupe_hash` over the **raw** CSV row, unique per
  `(account, dedupe_hash)`. `category`, `additional_labels`, and `exclude_from_summary` are user-set and are
  never overwritten by re-import.
- Household-scoped resources check membership via the M2M `household.users`, raising `HttpError(403)` for
  non-members and `HttpError(404)`/`get_object_or_404` for missing rows — follow this pattern rather than
  relying on `DoesNotExist` leaking through.
- Password validation is layered: Django's built-in validators plus custom ones in `users/validators.py`
  (`MinimumLengthValidator` min 14, upper/lower/numeric/special-char requirements).
- Ruff config (`backend/pyproject.toml`) enforces import ordering with `known-first-party = ["api", "config",
  "schemas", "transactions", "users"]` — note `banking` and `budgets` are not yet listed there.

### Frontend: structure and conventions

- Path aliases (`@serve`, `@components`, `@pages`, `@layout`, `@context`, `@services`, `@utils`, `@tests`) are
  defined in both `vite.config.ts` and `tsconfig.app.json` and must stay in sync. **Relative imports
  (`./x`, `../x`) are ESLint errors** outside of `.css` imports — always use the alias form.
- `src/services/` holds one fetch-based API client module per backend resource, all built on the shared
  `apiFetch` wrapper in `services/api-client.ts`, which attaches the `X-CSRFToken` header (read from the
  `csrftoken` cookie) on mutating requests and throws `ApiError` on non-2xx responses.
- `src/pages/<feature>/` groups a page with its own components/hooks (e.g.
  `transactions/transactions-table/`, `households/label-management-dialog/`); shared cross-page components
  live in `src/components/`.
- Routing lives entirely in `App.tsx`; new authenticated pages should be wrapped in `<ProtectedRoute>`, public
  ones in `<PublicRoute>`.
- Component-per-directory pattern: `index.tsx` for the component, `*.story.tsx` for Storybook, `*.test.tsx`
  for Vitest + Testing Library, colocated in the same folder.
- Vitest has two projects: `unit` (`src/**/*.test.*`, no setup file) and `integration`
  (`tests/integration/**/*.test.*`, uses `tests/utils/setup.ts` and MSW handlers). Integration tests exercise
  flows across multiple components/services with mocked network calls via `msw`.
- MUI (`@mui/material`) + Emotion for styling/theming (`src/theme.ts`); TanStack Query for server state;
  react-router v7 for routing.

## Git workflow

- Direct commits to `main` are blocked by a pre-commit hook (`scripts/hooks/protect-main.py`) — always work on
  a feature branch.
- `scripts/hooks/lint.py` (installed via `scripts/install-hooks.sh`) runs ESLint on staged
  `frontend/src|tests/**/*.{ts,tsx}` and `ruff format --diff` + `ruff check` on staged `backend/**/*.{py,pyi}`
  before every commit.
- CI (`.github/workflows/test.yml`) runs, per PR: backend `ruff check .` + `pytest -v` against a real MySQL
  database, and frontend `tsc --noEmit` + `pnpm lint` + `pnpm test --run`. Match these locally before pushing.
