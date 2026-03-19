"""FastAPI endpoint tests for SuperPatch S.T.A.R. agent backend."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200() -> None:
    """GET /health returns 200 and status ok."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_chat_returns_401_without_auth_header() -> None:
    """POST /chat returns 401 when Authorization header is missing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "context": {},
            },
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_returns_401_with_invalid_token() -> None:
    """POST /chat returns 401 when Bearer token is invalid."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "Hello"}],
                "context": {},
            },
            headers={"Authorization": "Bearer invalid-token"},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_returns_422_with_empty_messages() -> None:
    """POST /chat returns 422 when messages list is empty."""
    mock_user = MagicMock()
    mock_user.id = "test-user-id"
    mock_response = MagicMock()
    mock_response.user = mock_user
    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = mock_response

    def mock_get_client():
        return mock_client

    with patch("app.main.validate_request", new_callable=AsyncMock, return_value="test-user-id"):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/chat",
                json={
                    "messages": [],
                    "context": {},
                },
                headers={"Authorization": "Bearer valid-token"},
            )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_returns_sse_stream_for_valid_request() -> None:
    """POST /chat returns SSE stream for valid request when graph is mocked."""
    async def mock_astream_events(*args: object, **kwargs: object):
        chunk = MagicMock()
        chunk.content = "Hi"
        yield {"event": "on_chat_model_stream", "data": {"chunk": chunk}}

    mock_graph = MagicMock()
    mock_graph.astream_events = mock_astream_events

    with patch("app.main.validate_request", new_callable=AsyncMock, return_value="test-user-id"):
        with patch("app.main.get_compiled_graph", new_callable=AsyncMock, return_value=mock_graph):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/chat",
                    json={
                        "messages": [{"role": "user", "content": "Hello"}],
                        "context": {},
                    },
                    headers={"Authorization": "Bearer valid-token"},
                )

    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("text/event-stream")
    body = response.text
    assert "text_delta" in body or "done" in body
