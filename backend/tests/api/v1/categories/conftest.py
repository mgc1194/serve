"""
tests/api/v1/categories/conftest.py — Shared fixtures for category endpoint tests.

Root conftest provides: alice, seth, household, other_household, category.
"""

import pytest
from ninja.testing import TestClient

from api.v1.categories import router


@pytest.fixture
def client():
    return TestClient(router)
