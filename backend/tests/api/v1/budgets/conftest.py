"""
tests/api/v1/budgets/conftest.py — Shared fixtures for budget endpoint tests.

Root conftest provides: alice, seth, household, other_household, category, budget.
"""

import pytest
from ninja.testing import TestClient

from api.v1.budgets import router


@pytest.fixture
def client():
    return TestClient(router)
