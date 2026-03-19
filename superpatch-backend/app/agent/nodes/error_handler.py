"""Fallback error handler for the agent graph."""

import logging
from typing import Any

from app.agent.state import UnifiedAgentState

logger = logging.getLogger(__name__)


def _is_rate_limit_error(exc: BaseException) -> bool:
    exc_str = str(exc).lower()
    return (
        "429" in exc_str
        or "resource exhausted" in exc_str
        or "rate limit" in exc_str
        or "quota" in exc_str
    )


def _is_timeout_error(exc: BaseException) -> bool:
    exc_str = str(exc).lower()
    return (
        "deadline" in exc_str
        or "timeout" in exc_str
        or "timed out" in exc_str
    )


def _is_supabase_error(exc: BaseException) -> bool:
    exc_str = str(exc).lower()
    exc_type = type(exc).__name__.lower()
    return (
        "connect" in exc_str
        or "connection" in exc_str
        or "supabase" in exc_str
        or "httpx" in exc_type
        or "remoteprotocolerror" in exc_type
        or "connecterror" in exc_type
    )


async def handle_error(state: UnifiedAgentState, error: Exception) -> dict[str, Any]:
    """Return a friendly error message appropriate to the error type. Logs full traceback."""
    logger.exception("Agent error: %s", error)

    if _is_rate_limit_error(error):
        return {
            "error_type": "rate_limited",
            "message": "The AI service is temporarily busy. Please wait a moment and try again.",
        }
    if _is_timeout_error(error):
        return {
            "error_type": "timeout",
            "message": "The request took too long. Please try again.",
        }
    if _is_supabase_error(error):
        return {
            "error_type": "service_unavailable",
            "message": "The database service is temporarily unavailable. Please try again.",
        }
    return {
        "error_type": "unknown",
        "message": "Something went wrong. Please try again.",
    }
