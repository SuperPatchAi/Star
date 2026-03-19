"""Auth validation tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.auth import validate_request
from tests.conftest import TEST_USER_ID


@pytest.mark.asyncio
async def test_validate_request_raises_401_for_missing_auth_header() -> None:
    """validate_request raises 401 when Authorization header is missing."""
    with pytest.raises(HTTPException) as exc_info:
        await validate_request(None)
    assert exc_info.value.status_code == 401
    assert "Missing or malformed" in exc_info.value.detail


@pytest.mark.asyncio
async def test_validate_request_raises_401_for_empty_auth_header() -> None:
    """validate_request raises 401 when Authorization header is empty."""
    with pytest.raises(HTTPException) as exc_info:
        await validate_request("")
    assert exc_info.value.status_code == 401
    assert "Missing or malformed" in exc_info.value.detail


@pytest.mark.asyncio
async def test_validate_request_raises_401_for_malformed_auth_header() -> None:
    """validate_request raises 401 when Authorization header lacks Bearer prefix."""
    with pytest.raises(HTTPException) as exc_info:
        await validate_request("InvalidToken123")
    assert exc_info.value.status_code == 401
    assert "Missing or malformed" in exc_info.value.detail


@pytest.mark.asyncio
async def test_validate_request_raises_401_for_invalid_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """validate_request raises 401 when token is invalid (Supabase rejects)."""
    mock_client = MagicMock()
    mock_client.auth.get_user.side_effect = Exception("Invalid token")

    def mock_get_client():
        return mock_client

    monkeypatch.setattr("app.auth.get_supabase_client", mock_get_client)

    with pytest.raises(HTTPException) as exc_info:
        await validate_request("Bearer invalid-token")
    assert exc_info.value.status_code == 401
    assert "Token validation failed" in exc_info.value.detail or "Invalid" in exc_info.value.detail


@pytest.mark.asyncio
async def test_validate_request_returns_user_id_for_valid_token(
    monkeypatch: pytest.MonkeyPatch,
    test_user_id: str,
) -> None:
    """validate_request returns user_id when token is valid."""
    mock_user = MagicMock()
    mock_user.id = test_user_id

    mock_response = MagicMock()
    mock_response.user = mock_user

    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = mock_response

    def mock_get_client():
        return mock_client

    monkeypatch.setattr("app.auth.get_supabase_client", mock_get_client)

    result = await validate_request("Bearer valid-jwt-token")
    assert result == test_user_id
    mock_client.auth.get_user.assert_called_once_with("valid-jwt-token")


@pytest.mark.asyncio
async def test_validate_request_raises_401_when_user_id_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """validate_request raises 401 when Supabase returns user with no id."""
    mock_user = MagicMock()
    mock_user.id = None

    mock_response = MagicMock()
    mock_response.user = mock_user

    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = mock_response

    def mock_get_client():
        return mock_client

    monkeypatch.setattr("app.auth.get_supabase_client", mock_get_client)

    with pytest.raises(HTTPException) as exc_info:
        await validate_request("Bearer valid-jwt-token")
    assert exc_info.value.status_code == 401
    assert "no user ID" in exc_info.value.detail
