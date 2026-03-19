from __future__ import annotations

from unittest.mock import MagicMock

import pytest

TEST_USER_ID = "test-user-00000000-0000-0000-0000-000000000001"
TEST_CONTACT_ID = "test-contact-00000000-0000-0000-0000-000000000001"


@pytest.fixture
def test_user_id() -> str:
    return TEST_USER_ID


@pytest.fixture
def test_contact_id() -> str:
    return TEST_CONTACT_ID


@pytest.fixture
def mock_supabase(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Patch get_supabase_client to return a mock Supabase client.

    The mock is pre-configured with a chainable table().select().eq()...
    pattern. Tests should configure return values on the mock as needed:

        mock_supabase.table.return_value.select.return_value \\
            .eq.return_value.eq.return_value \\
            .single.return_value.execute.return_value.data = {...}
    """
    mock_client = MagicMock()

    chain = MagicMock()
    chain.execute.return_value.data = []
    chain.single.return_value.execute.return_value.data = {}
    chain.maybe_single.return_value.execute.return_value.data = None

    for method in (
        "select", "insert", "update", "upsert", "delete",
        "eq", "neq", "gt", "gte", "lt", "lte",
        "contains", "not_", "is_", "order", "limit",
    ):
        setattr(chain, method, MagicMock(return_value=chain))

    mock_client.table.return_value = chain

    monkeypatch.setattr(
        "app.db.supabase_client._client", mock_client
    )

    return mock_client
