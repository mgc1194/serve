"""
config/api.py — Single NinjaAPI instance shared across all apps.

All versioned routers are registered here and mounted once in urls.py.
Using a single NinjaAPI instance avoids URL routing conflicts.

Current versions:
    v1 — /api/v1/
"""

from ninja import NinjaAPI

from api.v1.users import router as users_v1_router
from transactions.api import router as transactions_router

api = NinjaAPI(version='1.0.0')

api.add_router('/v1', users_v1_router)

# Transactions router is not yet versioned — will be moved to api/v1/
# in a follow-up refactor.
api.add_router('', transactions_router)