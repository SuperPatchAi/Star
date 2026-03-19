"""Intent classification tests for SuperPatch S.T.A.R. agent router."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.nodes.router import classify_intent
from app.agent.state import UnifiedAgentState
from langchain_core.messages import HumanMessage


def _make_state(messages: list[str], **kwargs: object) -> UnifiedAgentState:
    """Build UnifiedAgentState with messages and optional overrides."""
    lc_messages = [HumanMessage(content=m) for m in messages]
    return {
        "messages": lc_messages,
        "user_id": "test-user-id",
        "domain_hint": kwargs.get("domain_hint"),
        "selected_contact_id": kwargs.get("selected_contact_id"),
        "current_skill": kwargs.get("current_skill"),
    }


@pytest.mark.asyncio
async def test_classify_intent_contact_query(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sales/contact intent: 'Show me John's contact info' -> contact_query."""
    mock_result = MagicMock()
    mock_result.intent = "contact_query"

    mock_model = MagicMock()
    mock_model.ainvoke = AsyncMock(return_value=mock_result)

    mock_structured = MagicMock(return_value=mock_model)

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
        with patch(
            "app.agent.nodes.router.ChatGoogleGenerativeAI",
            return_value=mock_model,
        ):
            mock_model.with_structured_output = MagicMock(return_value=mock_model)

            state = _make_state(["Show me John's contact info"])
            result = await classify_intent(state)

    assert result["intent"] == "contact_query"


@pytest.mark.asyncio
async def test_classify_intent_skill_executor(monkeypatch: pytest.MonkeyPatch) -> None:
    """Coaching intent: 'Let's work on the Financial Ladder' -> skill_executor."""
    mock_result = MagicMock()
    mock_result.intent = "skill_executor"

    mock_model = MagicMock()
    mock_model.ainvoke = AsyncMock(return_value=mock_result)

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
        with patch(
            "app.agent.nodes.router.ChatGoogleGenerativeAI",
            return_value=mock_model,
        ):
            mock_model.with_structured_output = MagicMock(return_value=mock_model)

            state = _make_state(["Let's work on the Financial Ladder"])
            result = await classify_intent(state)

    assert result["intent"] == "skill_executor"


@pytest.mark.asyncio
async def test_classify_intent_general_chat(monkeypatch: pytest.MonkeyPatch) -> None:
    """General chat: 'Hello' -> general_chat."""
    mock_result = MagicMock()
    mock_result.intent = "general_chat"

    mock_model = MagicMock()
    mock_model.ainvoke = AsyncMock(return_value=mock_result)

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
        with patch(
            "app.agent.nodes.router.ChatGoogleGenerativeAI",
            return_value=mock_model,
        ):
            mock_model.with_structured_output = MagicMock(return_value=mock_model)

            state = _make_state(["Hello"])
            result = await classify_intent(state)

    assert result["intent"] == "general_chat"


@pytest.mark.asyncio
async def test_classify_intent_sales_coaching(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sales coaching intent: 'How do I handle price objections?' -> sales_coaching."""
    mock_result = MagicMock()
    mock_result.intent = "sales_coaching"

    mock_model = MagicMock()
    mock_model.ainvoke = AsyncMock(return_value=mock_result)

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
        with patch(
            "app.agent.nodes.router.ChatGoogleGenerativeAI",
            return_value=mock_model,
        ):
            mock_model.with_structured_output = MagicMock(return_value=mock_model)

            state = _make_state(["How do I handle price objections?"])
            result = await classify_intent(state)

    assert result["intent"] == "sales_coaching"


@pytest.mark.asyncio
async def test_classify_intent_includes_context_signals(monkeypatch: pytest.MonkeyPatch) -> None:
    """classify_intent passes domain_hint, selected_contact_id, current_skill to system prompt."""
    mock_result = MagicMock()
    mock_result.intent = "general_chat"

    mock_model = MagicMock()
    mock_model.ainvoke = AsyncMock(return_value=mock_result)

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
        with patch(
            "app.agent.nodes.router.ChatGoogleGenerativeAI",
            return_value=mock_model,
        ):
            mock_model.with_structured_output = MagicMock(return_value=mock_model)

            state = _make_state(
                ["What's my progress?"],
                domain_hint="contacts",
                selected_contact_id="contact-123",
                current_skill="financial_ladder_assessment",
            )
            await classify_intent(state)

    call_args = mock_model.ainvoke.call_args[0][0]
    system_content = call_args[0]["content"]
    assert "contacts" in system_content
    assert "yes" in system_content
